"""Render the standalone EKS restore manifests without contacting the cluster.

Apply db.yaml and restore PostgreSQL before applying application.yaml.
Create perform-plus-secrets from private inputs; this renderer never reads secrets.
"""
import argparse
import json
from pathlib import Path
import re
import subprocess

import yaml


ROOT = Path(__file__).resolve().parents[1]
NAMESPACE = "perform-plus"
HOSTS = ["performplus.idaibhealth.com", "performplus.citiustech.online"]
STORAGE_CLASS = "perform-plus-gp3"


def terraform_value(outputs, name):
    try:
        value = outputs[name]["value"]
    except (KeyError, TypeError) as error:
        raise ValueError(f"Missing Terraform output: {name}") from error
    if value is None or value == "" or value == []:
        raise ValueError(f"Empty Terraform output: {name}")
    return value


def pinned_image(value):
    if not re.fullmatch(r"[A-Za-z0-9._:/-]+@sha256:[0-9a-f]{64}", value):
        raise argparse.ArgumentTypeError("Use a full image URI pinned with @sha256:<64 hex characters>")
    return value


def render(outputs, source_sha, api_image, ui_image):
    cluster_name = terraform_value(outputs, "cluster_name")
    vpc_id = terraform_value(outputs, "vpc_id")
    subnets = terraform_value(outputs, "public_subnet_ids")
    certificates = (
        terraform_value(outputs, "certificate_arns")
        if "certificate_arns" in outputs
        else [terraform_value(outputs, "certificate_arn")]
    )
    ingress_role = terraform_value(outputs, "ingress_role_arn")
    if not isinstance(subnets, list) or len(subnets) < 2:
        raise ValueError("public_subnet_ids must contain at least two ALB subnets")
    if isinstance(certificates, dict):
        certificates = [certificates[host] for host in HOSTS]
    if not isinstance(certificates, list) or not certificates:
        raise ValueError("certificate_arns must contain the validated certificate or certificates covering both hostnames")
    for subnet in subnets:
        if not isinstance(subnet, str) or not re.fullmatch(r"subnet-[0-9a-f]+", subnet):
            raise ValueError("Invalid public subnet ID")
    for certificate in certificates:
        if not isinstance(certificate, str) or not re.fullmatch(
            r"arn:aws:acm:us-west-2:703671901662:certificate/[0-9a-f-]+", certificate
        ):
            raise ValueError("Certificates must belong to AWS account 703671901662 in us-west-2")
    certificates = list(dict.fromkeys(certificates))
    if not isinstance(ingress_role, str) or not ingress_role.startswith("arn:aws:iam::703671901662:role/"):
        raise ValueError("The ingress IAM role must belong to AWS account 703671901662")

    base = subprocess.check_output(
        ["kubectl", "kustomize", str(ROOT / "deploy/k8s")], text=True
    )
    documents = list(yaml.safe_load_all(base))
    database = []
    application = []
    namespace = None
    for item in documents:
        kind = item["kind"]
        name = item["metadata"]["name"]
        if kind == "Namespace":
            namespace = item
            database.append(item)
            continue
        item["metadata"]["namespace"] = NAMESPACE
        if kind == "ConfigMap":
            item["data"].update({
                "CT_ALLOWED_ORIGINS": ",".join(f"https://{host}" for host in HOSTS),
                "CT_SECURE_COOKIE": "true",
                "API_INTERNAL_URL": "http://api:8000",
            })
        if kind in ("Deployment", "StatefulSet"):
            template = item["spec"]["template"]
            template.setdefault("metadata", {}).setdefault("annotations", {})[
                "perform-plus/source-sha"
            ] = source_sha
            pod = template["spec"]
            pod["automountServiceAccountToken"] = False
            pod["nodeSelector"] = {"workload": NAMESPACE}
            pod.pop("tolerations", None)
            container = pod["containers"][0]
            if name in ("api", "ui"):
                container["image"] = api_image if name == "api" else ui_image
                container["resources"] = {
                    "requests": {
                        "cpu": "250m" if name == "api" else "100m",
                        "memory": "512Mi" if name == "api" else "128Mi",
                    },
                    "limits": {"cpu": "2", "memory": "2Gi" if name == "api" else "512Mi"},
                }
            if name == "api":
                container["env"].append({
                    "name": "CT_SUPERUSER_PASSWORD",
                    "valueFrom": {"secretKeyRef": {
                        "name": "perform-plus-secrets", "key": "CT_SUPERUSER_PASSWORD"
                    }},
                })
            if kind == "StatefulSet" and name == "db":
                for claim in item["spec"]["volumeClaimTemplates"]:
                    claim["spec"]["storageClassName"] = STORAGE_CLASS
        (database if name == "db" else application).append(item)

    if namespace is None:
        raise ValueError("Base manifests did not contain the Perform+ namespace")
    database.insert(1, {
        "apiVersion": "storage.k8s.io/v1",
        "kind": "StorageClass",
        "metadata": {"name": STORAGE_CLASS},
        "provisioner": "ebs.csi.aws.com",
        "volumeBindingMode": "WaitForFirstConsumer",
        "allowVolumeExpansion": True,
        "reclaimPolicy": "Retain",
        "parameters": {"type": "gp3", "encrypted": "true"},
    })
    application.append({
        "apiVersion": "networking.k8s.io/v1",
        "kind": "Ingress",
        "metadata": {
            "name": NAMESPACE,
            "namespace": NAMESPACE,
            "annotations": {
                "alb.ingress.kubernetes.io/scheme": "internet-facing",
                "alb.ingress.kubernetes.io/target-type": "ip",
                "alb.ingress.kubernetes.io/subnets": ",".join(subnets),
                "alb.ingress.kubernetes.io/listen-ports": '[{"HTTP":80},{"HTTPS":443}]',
                "alb.ingress.kubernetes.io/ssl-redirect": "443",
                "alb.ingress.kubernetes.io/ssl-policy": "ELBSecurityPolicy-TLS13-1-2-2021-06",
                "alb.ingress.kubernetes.io/certificate-arn": ",".join(certificates),
                "alb.ingress.kubernetes.io/healthcheck-path": "/health",
                "alb.ingress.kubernetes.io/success-codes": "200",
                "alb.ingress.kubernetes.io/tags": "Project=perform-plus",
            },
        },
        "spec": {
            "ingressClassName": "perform-plus-alb",
            "tls": [{"hosts": HOSTS}],
            "rules": [{
                "host": host,
                "http": {"paths": [{
                    "path": "/", "pathType": "Prefix",
                    "backend": {"service": {"name": "ui", "port": {"number": 3000}}},
                }]},
            } for host in HOSTS],
        },
    })
    controller = {
        "clusterName": cluster_name,
        "region": "us-west-2",
        "vpcId": vpc_id,
        "replicaCount": 1,
        "watchNamespace": NAMESPACE,
        "ingressClass": "perform-plus-alb",
        "createIngressClassResource": True,
        "enableServiceMutatorWebhook": False,
        "serviceAccount": {
            "create": True,
            "name": "aws-load-balancer-controller",
            "annotations": {"eks.amazonaws.com/role-arn": ingress_role},
        },
        "nodeSelector": {"workload": NAMESPACE},
        "resources": {
            "requests": {"cpu": "100m", "memory": "128Mi"},
            "limits": {"cpu": "1", "memory": "384Mi"},
        },
    }
    return namespace, database, application, controller


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--terraform-outputs", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--source-sha", required=True)
    parser.add_argument("--api-image", required=True, type=pinned_image)
    parser.add_argument("--ui-image", required=True, type=pinned_image)
    args = parser.parse_args()
    if not re.fullmatch(r"[0-9a-f]{40}", args.source_sha):
        parser.error("--source-sha requires a full 40-character source SHA")
    if not args.output.resolve().is_relative_to((ROOT / ".local").resolve()):
        parser.error("--output must be inside the ignored .local directory")
    try:
        namespace, database, application, controller = render(
            json.loads(args.terraform_outputs.read_text()), args.source_sha,
            args.api_image, args.ui_image,
        )
    except (ValueError, KeyError, TypeError) as error:
        parser.error(str(error))
    args.output.mkdir(parents=True, exist_ok=True)
    for name, docs in (
        ("namespace.yaml", [namespace]),
        ("db.yaml", database),
        ("application.yaml", application),
        ("controller-values.yaml", [controller]),
    ):
        (args.output / name).write_text(yaml.safe_dump_all(docs, sort_keys=False))
    print(f"Rendered restore manifests in {args.output}; no cluster changes made.")


if __name__ == "__main__":
    main()
