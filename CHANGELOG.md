v2.5 (November 2020)
====================

(User-visible changes only)

- Improve display of draughtproofing measures (closes #604)
- Remove misleading and unlabelled SAP figure (closes #644)
- Fix water storage measures (closes #501)
  * Non-baseline scenarios should only be able to have water storage
    measures (this was got wrong in the previous commit)
  * Hot water storage measures were never handled correctly, never
    showed up on reports etc. due to a bunch of typos(?).  They now
    do show up in the right places.
- Make number of storeys an editable value (closes #532)
- Add organisation name to assessment view.
- Only assessments in an org can create reports for that org (closes
  #648)
- Fix commentary text 'stickiness' (closes #618)
- Make it clearer how to select the cover image (closes #636)
- Make it clearer whether an assessment belongs to an individual or to
  an organsiation (closes #489)
- Allow specifying org when creating assessment (#489)
- Default to making it an organisation's assessment when you are only in
  one organisation.  (#489)
- Display org name in assessment list view (#489)
- Show assessments from your organisations in assessment list (#489)
- Add flood risk from reservoirs to questionnaire (#591)
  But not the report yet.
- Add don't know/not applicable options to thermal comfort Qs (closes #488)
- Add 'variable' as option to daylight question (closes #605)
- Use space heating demand on sidebar (closes #613)
- Correct colour of bills data on bar chart (closes #646)
- Stop opening assessments in new tab (closes #523)
- The interface should feel less 'laggy'/'sticky' in general now.
- Correct piperwok -> pipework in user visible places (closes #603)
- Use 'baseline' instead of 'master' for base scenario (closes #611)
- Improve usability of TMP settings (closes #539)
