"use client";

import { useEffect, useState } from "react";
import {
  ArrowLeft, ArrowRight, ChartNoAxesCombined, ClipboardCheck, FileSearch,
  FolderCheck, GitBranch, Layers3, ListChecks, Pause, Play, ScanLine,
  ShieldCheck, Sparkles, Users,
} from "lucide-react";
import styles from "./sign-in-carousel.module.css";

const SLIDE_INTERVAL = 9000;

const slides = [
  {
    id: "intelligence",
    label: "AI intelligence",
    eyebrow: "A smarter way to work",
    title: "Next-gen risk",
    emphasis: "adjustment, with AI.",
    description: "Bring AI-assisted discovery, evidence-linked review and explainable risk insights into one connected workspace. Built around the people making every decision.",
    takeaway: "AI-assisted. Clinician-led.",
    panelTitle: "Intelligence with context",
    panelIcon: Sparkles,
    features: [
      { icon: ScanLine, title: "Surface potential gaps", description: "Focus attention on findings ready for review." },
      { icon: FileSearch, title: "Connect the evidence", description: "Explore the sources behind each finding." },
      { icon: ShieldCheck, title: "Keep expertise in control", description: "Clinical review and QA guide every outcome." },
    ],
    panelFooter: "AI suggests. Your team decides.",
  },
  {
    id: "evidence",
    label: "Clinical clarity",
    eyebrow: "Evidence at your fingertips",
    title: "Every finding.",
    emphasis: "The full picture.",
    description: "Move from a potential gap to the source that supports it. Charts, evidence and review decisions stay connected, so your team can work with clarity.",
    takeaway: "Source to decision, in one view.",
    panelTitle: "A connected review",
    panelIcon: FileSearch,
    features: [
      { icon: FileSearch, title: "Find the source", description: "Open the clinical context behind a finding." },
      { icon: ClipboardCheck, title: "Make an informed decision", description: "Review evidence alongside the member story." },
      { icon: FolderCheck, title: "Keep the reasoning", description: "Retain decisions, notes and evidence links." },
    ],
    panelFooter: "Clear context. Traceable decisions.",
  },
  {
    id: "workflow",
    label: "Everyday ease",
    eyebrow: "Designed for your day",
    title: "Less switching.",
    emphasis: "More progress.",
    description: "Prioritize work, review charts and move cases through QA from one consistent workspace. Clear queues and familiar controls keep the next step in view.",
    takeaway: "One workspace. A smoother review flow.",
    panelTitle: "From queue to completion",
    panelIcon: Layers3,
    features: [
      { icon: ListChecks, title: "Know where to start", description: "Find and filter the work that needs attention." },
      { icon: Users, title: "Keep teams connected", description: "Coordinate reviews, campaigns and follow-up." },
      { icon: ShieldCheck, title: "Move forward with clarity", description: "Follow each case through its review gates." },
    ],
    panelFooter: "Less friction between each step.",
  },
  {
    id: "insights",
    label: "Risk insights",
    eyebrow: "From detail to direction",
    title: "Know what changed.",
    emphasis: "See what matters.",
    description: "Explore member risk profiles, model-specific scores and population trends. Trace results back to their inputs and follow outcomes through reporting.",
    takeaway: "Explainable scores. Connected outcomes.",
    panelTitle: "Insight at every level",
    panelIcon: ChartNoAxesCombined,
    features: [
      { icon: Users, title: "Understand the member", description: "See risk profiles and contributing factors." },
      { icon: GitBranch, title: "Explain the result", description: "Follow model inputs and calculation history." },
      { icon: ChartNoAxesCombined, title: "See the bigger picture", description: "Explore coverage, trends and review outcomes." },
    ],
    panelFooter: "From individual evidence to portfolio insight.",
  },
];

export function SignInCarousel({ pauseForLogin }: { pauseForLogin: boolean }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [hovered, setHovered] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(true);
  const [pageVisible, setPageVisible] = useState(true);

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncMotion = () => {
      setReducedMotion(preference.matches);
      if (preference.matches) setPlaying(false);
    };
    const syncVisibility = () => setPageVisible(!document.hidden);
    syncMotion();
    syncVisibility();
    preference.addEventListener("change", syncMotion);
    document.addEventListener("visibilitychange", syncVisibility);
    return () => {
      preference.removeEventListener("change", syncMotion);
      document.removeEventListener("visibilitychange", syncVisibility);
    };
  }, []);

  const rotating = playing && !hovered && !pauseForLogin && !reducedMotion && pageVisible;

  useEffect(() => {
    if (!rotating) return;
    const timer = window.setTimeout(() => setActiveIndex((index) => (index + 1) % slides.length), SLIDE_INTERVAL);
    return () => window.clearTimeout(timer);
  }, [activeIndex, rotating]);

  const selectSlide = (index: number) => {
    setPlaying(false);
    setActiveIndex((index + slides.length) % slides.length);
  };
  const slide = slides[activeIndex];
  const PanelIcon = slide.panelIcon;

  return (
    <section
      className={styles.carousel}
      aria-label="Discover Perform+"
      aria-roledescription="carousel"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={(event) => {
        if (!(event.target as HTMLElement).closest("[data-carousel-rotation]")) setPlaying(false);
      }}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
          event.preventDefault();
          selectSlide(activeIndex + (event.key === "ArrowRight" ? 1 : -1));
        }
      }}
    >
      <div className={styles.stage} aria-live={rotating ? "off" : "polite"} aria-atomic="true">
        <article
          key={slide.id}
          id="perform-capability-slide"
          className={styles.slide}
          aria-roledescription="slide"
          aria-label={`${activeIndex + 1} of ${slides.length}: ${slide.label}`}
        >
          <div className={styles.copy}>
            <p className={styles.eyebrow}>{slide.eyebrow}</p>
            <h2>{slide.title}<span>{slide.emphasis}</span></h2>
            <p className={styles.description}>{slide.description}</p>
            <p className={styles.takeaway}><span aria-hidden="true" />{slide.takeaway}</p>
          </div>
          <div className={styles.featurePanel}>
            <div className={styles.panelHeader}>
              <span className={styles.panelIcon}><PanelIcon size={22} aria-hidden="true" /></span>
              <div><p>Perform+</p><h3>{slide.panelTitle}</h3></div>
            </div>
            <div className={styles.features}>
              {slide.features.map(({ icon: Icon, title, description }) => (
                <div className={styles.feature} key={title}>
                  <span className={styles.featureIcon}><Icon size={20} aria-hidden="true" /></span>
                  <div><strong>{title}</strong><p>{description}</p></div>
                </div>
              ))}
            </div>
            <p className={styles.panelFooter}>{slide.panelFooter}</p>
          </div>
        </article>
      </div>
      <div className={styles.navigation}>
        <div className={styles.slideChoices} role="group" aria-label="Choose a capability slide">
          {slides.map((item, index) => (
            <button
              type="button"
              key={item.id}
              aria-label={`Show slide ${index + 1}: ${item.label}`}
              aria-current={index === activeIndex ? "true" : undefined}
              aria-controls="perform-capability-slide"
              onClick={() => selectSlide(index)}
            >
              <span>{String(index + 1).padStart(2, "0")}</span>{item.label}
            </button>
          ))}
        </div>
        <div className={styles.controls}>
          <button type="button" aria-label="Previous slide" onClick={() => selectSlide(activeIndex - 1)}><ArrowLeft size={18} /></button>
          <button
            type="button"
            data-carousel-rotation
            aria-label={playing && !reducedMotion ? "Pause slideshow" : "Play slideshow"}
            disabled={reducedMotion}
            title={reducedMotion ? "Automatic rotation is off to respect reduced motion" : undefined}
            onClick={() => setPlaying((value) => !value)}
          >
            {playing && !reducedMotion ? <Pause size={16} /> : <Play size={16} />}
          </button>
          <button type="button" aria-label="Next slide" onClick={() => selectSlide(activeIndex + 1)}><ArrowRight size={18} /></button>
        </div>
      </div>
      <div className={styles.footer}>
        <span>CitiusTech · Perform+</span><span>Evidence. Insight. Action.</span>
      </div>
    </section>
  );
}
