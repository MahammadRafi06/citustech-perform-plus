"""Calendar-aligned population RAF estimates, not observed CMS payment history.

Design references and the boundary between published facts and local assumptions
are recorded in docs/POPULATION_AND_RAF_TRENDS.md. National annual estimates do
not provide monthly plan observations. These restrained monthly cohort profiles
remain authored assumptions, separately identified in report provenance.
"""
MONTHS = ('Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec')
# Small changes in membership mix; a larger midyear update, no repeating zigzag.
BASELINE = (.9838, .9833, .9860, .9872, .9864, .9891, .9972, .9980, 1., 1.0011, 1.0022, 1.0040)
# Remaining opportunity narrows as conditions enter the submitted/accepted sets.
OPPORTUNITY = (1.20, 1.19, 1.16, 1.15, 1.13, 1.10, 1.05, 1.02, 1., .99, .98, .97)
ACCEPTED = (.30, .30, .30, .30, .30, .30, .53, .53, .54, .54, .54, .54)
SUBMITTED = (.50, .52, .555, .54, .57, .595, .63, .61, .62, .64, .67, .70)


def month_index(month):
    if not 1 <= int(month) <= 12:
        raise ValueError('Reporting month must be between January and December.')
    return int(month)-1


def baseline_factor(month):
    return BASELINE[month_index(month)]


def score_sets(baseline, positive_uplift, month=9):
    if baseline is None:
        return dict(captured_baseline=None, potential=None, submitted=None, accepted=None)
    i = month_index(month)
    gap = max(float(positive_uplift), .006) * OPPORTUNITY[i]
    return dict(captured_baseline=baseline, potential=baseline+gap,
                submitted=baseline+gap*SUBMITTED[i], accepted=baseline+gap*ACCEPTED[i])


def series(bases, last_month):
    if bases['captured_baseline'] is None:
        return []
    last = month_index(last_month)
    reference = bases['captured_baseline'] / BASELINE[last]
    gap = (bases['potential']-bases['captured_baseline']) / OPPORTUNITY[last]
    points = []
    for i in range(last+1):
        baseline = reference*BASELINE[i]
        uplift = gap*OPPORTUNITY[i]
        points.append(dict(month=MONTHS[i], baseline=baseline, potential=baseline+uplift,
            submitted=baseline+uplift*SUBMITTED[i], accepted=baseline+uplift*ACCEPTED[i]))
    # Exact reconciliation, including a caller supplying independently calculated sets.
    points[-1].update(baseline=bases['captured_baseline'], potential=bases['potential'],
                      submitted=bases['submitted'], accepted=bases['accepted'])
    return points
