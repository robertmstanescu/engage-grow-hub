/**
 * The 21 Work pieces, in the order of the owner's portfolio doc.
 *
 * Voice: the owner's (my-writing-style), in plain confidence. Cases are
 * told in the third person as Robert's own work; playbooks use "we" for
 * the practice. British spelling, no Oxford comma, no em dashes, 0 to 9
 * as words. Only the agreed proof points appear as numbers.
 *
 * South Pole and Klarna are named wherever the work happened there
 * (owner's permission, 24 Nov 2026).
 * Steps marked `reconstructed: true` are the most likely action, not a
 * confirmed one; `reviewList()` hands them to the owner to check.
 */
import type { PortfolioEntry } from "./portfolio";

const SPECIALIST = "Global People, Culture and Communications Specialist";
const CLIMATE = "South Pole, a climate consultancy of 800 to 1,300 people in 36 countries";
const PLAYBOOK_LABEL = "Illustrative example, not client work";
const RECREATED_LABEL = "Recreated with dummy data";
const ROBERT = "Robert-Marian Stănescu, founder of The Magic Coffin";

export const WORK_PORTFOLIO: PortfolioEntry[] = [
  /* ── 01 ─────────────────────────────────────────────────────────── */
  {
    n: 1,
    slug: "town-halls",
    type: "case",
    pillar: "ic",
    title: "Town Halls people turned up for",
    summary:
      "How Robert built monthly Town Halls for South Pole's Certificates business line across three time zones, with live attendance around 60%.",
    metaTitle: "Town Halls with 60% live attendance: a case study",
    metaDescription:
      "How monthly Town Halls for a climate business line in 36 countries held around 60% live attendance, with one session for each time zone.",
    aiSummary:
      "Case study. From 2024 to January 2026, Robert-Marian Stănescu (founder of The Magic Coffin) set up and ran monthly Town Halls for the Certificates business line at South Pole, a climate consultancy of 800 to 1,300 people in 36 countries. He took the work on himself, ran sessions for APAC, EMEA and the Americas on Google Meet with Google Slides and Google Forms, and measured live attendance at around 60% of headcount per time zone. He also supported the quarterly global CEO Town Halls and ghostwrote for the executive committee.",
    honestyLabel: "Real work, South Pole, 2024 to 2026",
    roleTitle: SPECIALIST,
    year: "2024 to 2026",
    tags: ["Town Halls", "Leadership communication", "Internal communications", "Global teams"],
    cardStyle: "quote",
    metric: "~60%",
    metricLabel: "live attendance",
    pullLine: "They became reliable and engaging, delivering real impact and not just updates.",
    cover: {
      source: "Architecture/architecture-dark-conference-room-table.jpg",
      alt: "A long table in a dark meeting room, chairs set out and waiting for people to arrive.",
    },
    diagram: {
      kind: "flow",
      title: "One month of Town Halls",
      nodes: [
        { label: "Gather updates", note: "Leaders send news ahead" },
        { label: "Build one story", note: "One deck in Google Slides" },
        { label: "Run it three times", note: "APAC, EMEA, Americas" },
        { label: "Open the floor", note: "Questions in Google Forms" },
        { label: "Count who came", note: "Attendees against headcount" },
      ],
    },
    proofs: ["attendance", "countries"],
    featuredHome: true,
    related: ["internal-newsroom", "hard-announcement-kit"],
    sections: [
      {
        kind: "text",
        eyebrow: "The problem",
        title: "A business line that heard about changes last",
        paras: [
          "South Pole's Certificates business line (then called Climate Projects) had people in three time zones and teams that mostly kept to themselves. Changes reached them late and second-hand, and Town Halls happened when the team could squeeze them in.",
          "The cost landed on two groups: the people who found out about decisions after everyone else, and an operations team already stretched thin, who pulled each session together by hand.",
        ],
      },
      {
        kind: "steps",
        eyebrow: "What Robert did",
        title: "A monthly rhythm, built from scratch",
        steps: [
          { title: "Took it on", text: "Robert's own brief was a different business line. He saw the gap in Certificates and offered to run its Town Halls on top of the day job." },
          { title: "Set a monthly slot", text: "One Town Hall a month in a fixed slot, so leaders could plan their updates and teams could plan their diaries.", reconstructed: true },
          { title: "Followed the sun", text: "On busy days he ran the same session three times, once each for APAC, EMEA and the Americas, so every region heard it live in working hours." },
          { title: "Built one story", text: "He collected updates from the line's leaders ahead of each session and shaped them into one deck in Google Slides, with each speaker kept to time.", reconstructed: true },
          { title: "Opened the floor", text: "Questions came in through Google Forms, which gave quieter people a way in and gave leaders the hard questions in writing.", reconstructed: true },
          { title: "Counted who came", text: "He measured real attendees against headcount for each time zone. Live attendance held around 60%." },
        ],
      },
      { kind: "diagram", caption: "One month of Town Halls, from updates to attendance.", alt: "Diagram in five steps: gather updates from leaders, build one deck in Google Slides, run the session for APAC, EMEA and the Americas, take questions in Google Forms, count attendees against headcount." },
      {
        kind: "quote",
        quote:
          "Before Robert joined, the business line's town halls happened when the team could squeeze them in. However, once he came on board, he built the structure behind them, and that changed everything. They became reliable and engaging, delivering real impact and not just updates. This took a lot off the operations team, who were already stretched thin.",
        name: "Rachael Odhiambo",
        role: "Head of Operations - Certificates, South Pole",
        avatar: "/work/town-halls/rachael-odhiambo.webp",
        avatarAlt: "Portrait of Rachael Odhiambo",
        nameUrl: "https://www.linkedin.com/in/rachael-odhiambo-650a5a62/",
      },
      {
        kind: "text",
        eyebrow: "What changed",
        title: "From when-we-can to every month",
        paras: [
          "Town Halls became a fixed part of the month. Live attendance held around 60% of headcount, measured per time zone, and the operations team got back the hours it used to spend pulling sessions together.",
          "Alongside this, Robert supported the quarterly global CEO Town Halls and ghostwrote for the executive committee. The same updates ran in writing through the [internal newsroom](/work/internal-newsroom/).",
        ],
      },
      {
        kind: "text",
        eyebrow: "With hindsight",
        title: "What he would add next time",
        paras: [
          "More of the money. People want to know how the business is doing before they hear what it plans, so the financial picture earns a bigger slot.",
          "And more sessions on more days and times, so people at the edges of a time zone get a live seat too.",
        ],
      },
    ],
    faq: [
      { q: "How do you get people to attend a Town Hall live?", a: "Give it a fixed slot, run it once for each time zone and measure attendees against headcount per region. Here that held live attendance around 60%." },
      { q: "Which tools ran these Town Halls?", a: "Google Meet for the session, Google Slides for the deck and Google Forms for questions." },
      { q: "Who ran them?", a: `${ROBERT}, while he was ${SPECIALIST} at South Pole.` },
    ],
    questions: [
      "Was there a fixed monthly slot (same week, same time), as written?",
      "How did you use Google Forms: questions before the session, during it, or feedback after?",
      "Did you collect the leaders' updates and build the deck yourself, as written?",
      "Which two decisions about format and timing would you like named on the page?",
      "Headcount per session, only if you want a number shown.",
    ],
  },

  /* ── 02 ─────────────────────────────────────────────────────────── */
  {
    n: 2,
    slug: "internal-newsroom",
    type: "case",
    pillar: "ic",
    title: "An internal newsroom read 300K+ times a year",
    summary:
      "Four stories a month in articles, audio and video, for people in 36 countries, read more than 300,000 times a year.",
    metaTitle: "Internal newsroom with 300K+ views a year",
    metaDescription:
      "How an internal newsroom on LumApps published four stories a month in articles, audio and video, and passed 300,000 page views a year.",
    aiSummary:
      `Case study. At ${CLIMATE}, Robert-Marian Stănescu ran an internal newsroom on the LumApps intranet: about four stories a month, around 50 a year, as articles, audio and video. The newsroom passed 300,000 page views a year, measured.`,
    honestyLabel: "Real work, South Pole, 2023 to 2026",
    roleTitle: SPECIALIST,
    year: "2023 to 2026",
    tags: ["Internal newsroom", "Intranet", "LumApps", "Content"],
    cardStyle: "number",
    metric: "300K+",
    metricLabel: "page views a year",
    pullLine: "Four stories a month, in the format people would finish.",
    cover: {
      source: "People/people-silhouette-person-watching-screens.jpg",
      alt: "A person in silhouette watching a wall of glowing screens.",
    },
    diagram: {
      kind: "flow",
      title: "How a story reached the newsroom",
      nodes: [
        { label: "Spot it", note: "Teams, leaders, Town Halls" },
        { label: "Pick the format", note: "Article, audio or video" },
        { label: "Make it", note: "Write, record, edit" },
        { label: "Publish", note: "LumApps, by audience" },
        { label: "Check the reads", note: "Page views each month" },
      ],
    },
    proofs: ["pageViews", "countries"],
    featuredHome: true,
    related: ["town-halls", "intranet-rebuild"],
    sections: [
      {
        kind: "text",
        eyebrow: "The problem",
        title: "News that lived in inboxes and rumours",
        paras: [
          `At ${CLIMATE}, company news travelled by email, by team chat and by whoever happened to be in the room. People in smaller offices heard last.`,
          "The company needed one place where the news lived, written so people would want to read it.",
        ],
        reconstructed: true,
      },
      {
        kind: "steps",
        eyebrow: "What Robert did",
        title: "Ran it like a newsroom",
        steps: [
          { title: "Set a pace", text: "About four stories a month, around 50 a year, so people learned to check back." },
          { title: "Kept a story list", text: "He kept a running list fed by teams, leaders and the [Town Halls](/work/town-halls/), and picked each month's stories by who they affected most.", reconstructed: true },
          { title: "Picked the format", text: "Each story went out as an article, an audio piece or a video, chosen by what the story needed and how people would take it in." },
          { title: "Published by audience", text: "Stories went on the LumApps intranet and reached the people they were for through its audience targeting.", reconstructed: true },
          { title: "Watched the reads", text: "He tracked page views to see what people finished and fed that back into the next month's list." },
        ],
      },
      { kind: "diagram", caption: "From story idea to measured reads.", alt: "Diagram in five steps: spot the story, pick article, audio or video, make it, publish it on LumApps by audience, check page views each month." },
      {
        kind: "text",
        eyebrow: "What changed",
        title: "One place for the news",
        paras: [
          "The newsroom passed 300,000 page views a year, measured. For a company of 800 to 1,300 people, that is a lot of reading per person, and it gave leaders one channel they could count on.",
          "It ran on the intranet Robert also helped [rebuild](/work/intranet-rebuild/).",
        ],
      },
    ],
    faq: [
      { q: "How often should an internal newsroom publish?", a: "About once a week worked here: four stories a month, around 50 a year, as articles, audio and video." },
      { q: "Which platform hosted it?", a: "The LumApps intranet." },
    ],
    questions: [
      "Which year (or years) do the 300K+ page views cover?",
      "What was the problem before the newsroom, in your words? The page guesses email, chat and word of mouth.",
      "How were stories picked? The page guesses a running list fed by teams, leaders and Town Halls.",
      "Did you use LumApps audience targeting, as written?",
    ],
  },

  /* ── 03 ─────────────────────────────────────────────────────────── */
  {
    n: 3,
    slug: "intranet-rebuild",
    type: "case",
    pillar: "ic",
    title: "Rebuilding a company intranet on LumApps",
    summary:
      "A full intranet move: the migration, a new structure, landing pages, navigation, audience segments, training and an adoption campaign.",
    metaTitle: "Rebuilding a company intranet on LumApps",
    metaDescription:
      "How a 36-country company moved to LumApps: migration, information architecture, landing pages, segments, training and an adoption campaign.",
    aiSummary:
      `Case study. At ${CLIMATE}, Robert-Marian Stănescu helped rebuild the company intranet on LumApps. He worked on the migration, the information architecture, landing pages, navigation and audience segmentation, trained people to use it, ran an adoption campaign and set up an org chart that updates itself from HiBob through Google.`,
    honestyLabel: "Real work, South Pole, 2023 to 2026",
    roleTitle: SPECIALIST,
    year: "2023 to 2026",
    tags: ["Intranet", "LumApps", "Information architecture", "Adoption"],
    cardStyle: "photo",
    pullLine: "A front door people could find their way through.",
    cover: {
      source: "Abstract/abstract-glass-rainbow-refraction-closeup.jpg",
      alt: "Light split into a rainbow through a piece of glass.",
    },
    diagram: {
      kind: "flow",
      title: "The rebuild, in order",
      nodes: [
        { label: "Audit", note: "What exists, what's used" },
        { label: "Structure", note: "Sections and navigation" },
        { label: "Landing pages", note: "One per audience" },
        { label: "Migrate", note: "Move, merge, retire" },
        { label: "Launch", note: "Training and a campaign" },
      ],
    },
    proofs: ["countries"],
    featuredHome: false,
    related: ["org-chart-automation", "internal-newsroom"],
    sections: [
      {
        kind: "text",
        eyebrow: "The problem",
        title: "An intranet that grew by accident",
        paras: [
          "The old intranet had grown page by page. People searched, gave up and asked a colleague, which sent the same questions to the same few people every week.",
          "The move to LumApps was the chance to rebuild the structure around how people look for things.",
        ],
        reconstructed: true,
      },
      {
        kind: "steps",
        eyebrow: "What Robert did",
        title: "Structure first, then content",
        steps: [
          { title: "Audited what existed", text: "He listed the pages, owners and traffic, and sorted what to move, merge or retire.", reconstructed: true },
          { title: "Drew the structure", text: "He led the information architecture and the navigation, so each section had one clear home." },
          { title: "Designed landing pages", text: "He designed the landing pages people arrive on first, with segments so each audience saw what applied to them." },
          { title: "Moved the content", text: "He worked on the migration itself, page by page, with the owners of each section." },
          { title: "Trained and launched", text: "He trained people on the new intranet and ran an adoption campaign around the launch." },
          { title: "Automated the org chart", text: "He set up an org chart that updates itself from HiBob through Google. [How that chain works](/work/org-chart-automation/)." },
        ],
      },
      { kind: "diagram", caption: "The rebuild, from audit to launch.", alt: "Diagram in five steps: audit the old intranet, draw the structure and navigation, design landing pages per audience, migrate content, launch with training and a campaign." },
      {
        kind: "text",
        eyebrow: "What changed",
        title: "One front door for the company",
        paras: [
          "The company got one intranet with a structure people could learn, landing pages by audience and an org chart that keeps itself current. It became the home of the [internal newsroom](/work/internal-newsroom/).",
        ],
      },
    ],
    faq: [
      { q: "What does an intranet rebuild include?", a: "Here: the migration, information architecture, landing pages, navigation, audience segments, training, an adoption campaign and an automated org chart." },
      { q: "Which platform was it?", a: "LumApps, with people data coming from HiBob through Google." },
    ],
    questions: [
      "What was wrong with the old intranet, in your words? The page guesses it grew page by page.",
      "Did you run a content audit before the migration, as written?",
      "Who did you train: page owners, everyone, or both?",
      "Any detail on the adoption campaign you'd like named (a name, a channel)? No usage figure will be shown.",
    ],
  },

  /* ── 04 ─────────────────────────────────────────────────────────── */
  {
    n: 4,
    slug: "recognition-campaign",
    type: "artefact",
    pillar: "ic",
    title: "Recognition campaigns for an 18th birthday",
    summary:
      "Three LinkedIn campaigns that put employees at the front of a company's 18th anniversary, with carousel graphics Robert designed.",
    metaTitle: "Employee recognition campaigns on LinkedIn",
    metaDescription:
      "Three LinkedIn campaigns that celebrated employees for a company's 18th anniversary, with carousel graphics, plus the in-office celebrations.",
    aiSummary:
      "Artefact. For the 18th anniversary of South Pole, a climate consultancy, Robert-Marian Stănescu conceived and produced three employee recognition campaigns on South Pole's LinkedIn page, with carousel graphics he designed, and ran the in-office celebrations across several offices with the CEO joining live across time zones.",
    honestyLabel: "Real work, South Pole, linked at the source",
    roleTitle: SPECIALIST,
    year: "2024",
    tags: ["Recognition", "Employer brand", "LinkedIn", "Events"],
    cardStyle: "photo",
    pullLine: "The birthday was about the people who got the company there.",
    cover: {
      source: "Neon-Signage/neon-sign-crown-orange-yellow.jpg",
      alt: "A neon crown glowing orange and yellow on a dark wall.",
    },
    diagram: {
      kind: "flow",
      title: "One anniversary, inside and out",
      nodes: [
        { label: "Pick the people", note: "Award categories" },
        { label: "Design", note: "Carousel graphics" },
        { label: "Publish", note: "Company LinkedIn page" },
        { label: "Celebrate", note: "In every office" },
        { label: "Bring in the CEO", note: "Live across time zones" },
      ],
    },
    proofs: [],
    featuredHome: false,
    linkOut: "https://www.linkedin.com/posts/south-pole-global_south-pole-special-recognition-award-activity-7250434917644271616-sDdw/",
    related: ["recognition-platform", "work-for-the-world"],
    sections: [
      {
        kind: "text",
        eyebrow: "The brief",
        title: "Make the birthday about the people",
        paras: [
          "A company turning 18 has a story to tell, and the best version of it is the people who built it. The anniversary needed something staff would see, share and be proud of.",
        ],
      },
      {
        kind: "steps",
        eyebrow: "What Robert did",
        title: "Three campaigns and a party in every office",
        steps: [
          { title: "Conceived three campaigns", text: "Three recognition campaigns for South Pole's LinkedIn page, each putting named employees at the front." },
          { title: "Designed the carousels", text: "He designed the carousel graphics himself. The Special Recognition Award post is linked from this page." },
          { title: "Ran the offices", text: "He bought personalised merchandise, split the event budget across offices and worked with the workplace team in each location." },
          { title: "Brought in the CEO", text: "He lined up calls across time zones so the CEO could join each office's celebration live, and ran in-office awards on the day." },
        ],
      },
      { kind: "diagram", caption: "The anniversary, online and in the offices.", alt: "Diagram in five steps: pick the people, design carousel graphics, publish on South Pole's LinkedIn page, celebrate in every office, bring the CEO in live across time zones." },
      {
        kind: "text",
        eyebrow: "See it",
        title: "Linked, with the faces left where they belong",
        paras: [
          "The campaign features colleagues by name and face, so this page links to the original post on LinkedIn instead of copying it here. The recognition habit carried on in a [kudos tool Robert built later](/work/recognition-platform/).",
        ],
      },
    ],
    faq: [
      { q: "What is an employee recognition campaign on LinkedIn?", a: "A series of posts on the company page that names and celebrates employees. Here there were three, for South Pole's 18th anniversary." },
    ],
    questions: [
      "Which year was the 18th anniversary? The page says 2024 (from the post's date).",
      "How were the people chosen for the awards (nominations, categories, a panel)?",
    ],
  },

  /* ── 05 ─────────────────────────────────────────────────────────── */
  {
    n: 5,
    slug: "policy-explainers",
    type: "artefact",
    pillar: "ic",
    title: "Turning policies into two-minute videos",
    summary:
      "Robert scripted, shot and edited policy explainers until video became the standard. Here is a recreated sample.",
    metaTitle: "Policy explainer videos: a recreated sample",
    metaDescription:
      "How policy explainer videos are scripted, produced and edited, with a recreated sample script for a fictional policy. Recreated with dummy data.",
    aiSummary:
      "Artefact, recreated with dummy data. At South Pole, a climate consultancy, Robert-Marian Stănescu scripted, produced and edited a series of policy explainer videos, including volunteering leave and time off, and video became the standard format for policy communication there. The sample on this page uses a fictional policy.",
    honestyLabel: RECREATED_LABEL,
    roleTitle: SPECIALIST,
    year: "2023 to 2026",
    tags: ["Video", "Policy communication", "Scriptwriting"],
    cardStyle: "dark",
    pullLine: "Two minutes of video beats ten pages of policy.",
    cover: {
      source: "Neon-Signage/neon-triangle-tv-screens-abstract.jpg",
      alt: "Old television screens stacked into a triangle, glowing in the dark.",
    },
    diagram: {
      kind: "doc",
      title: "Sample script",
      heading: "Recharge Days, in two minutes (fictional policy)",
      blocks: [
        { label: "0:00 Hook", lines: ["You get two extra days off a year.", "Here's how to use them."] },
        { label: "0:15 What it is", lines: ["Two paid days, any time,", "booked like holiday."] },
        { label: "0:45 How to book", lines: ["Request in the HR system,", "tell your manager a week ahead."] },
        { label: "1:30 Where to ask", lines: ["Questions go to the People team", "channel. Link below."] },
      ],
    },
    proofs: [],
    featuredHome: false,
    related: ["hard-announcement-kit", "intranet-rebuild"],
    sections: [
      {
        kind: "text",
        eyebrow: "The brief",
        title: "Policies people would get to the end of",
        paras: [
          "South Pole preferred video to long articles for policy news, because video is easier to take in. Robert turned that preference into a habit.",
        ],
      },
      {
        kind: "steps",
        eyebrow: "What Robert did",
        title: "Script, shoot, cut",
        steps: [
          { title: "Read the policy", text: "He pulled out the three things a person needs: what it is, how to use it and where to ask.", reconstructed: true },
          { title: "Wrote the script", text: "Short lines, plain words, the reader's question first." },
          { title: "Checked it", text: "The policy owner signed off the script before anything was filmed.", reconstructed: true },
          { title: "Produced and edited", text: "He produced and edited each video himself, including volunteering leave and time off." },
        ],
      },
      { kind: "diagram", caption: "A recreated script for a fictional policy, Recharge Days.", alt: "A sample video script in four timed parts for a fictional Recharge Days policy: the hook, what it is, how to book it and where to ask." },
      {
        kind: "text",
        eyebrow: "What changed",
        title: "Video became the standard",
        paras: [
          "After the series, video became the company's standard format for explaining a policy. The script above is a recreation with a fictional policy, so the real ones stay with the company.",
          "The same plain-words habit runs through the [hard announcement kit](/work/hard-announcement-kit/) and the [intranet rebuild](/work/intranet-rebuild/).",
        ],
      },
    ],
    faq: [
      { q: "How long should a policy explainer video be?", a: "Around two minutes: what it is, how to use it and where to ask." },
      { q: "Is the sample script real?", a: "It is recreated with dummy data, for a fictional policy." },
    ],
    questions: [
      "How many videos were in the series, roughly?",
      "Did the policy owner sign off each script, as written?",
      "Would you like a short recreated video file on the page as well as the script?",
    ],
  },

  /* ── 06 ─────────────────────────────────────────────────────────── */
  {
    n: 6,
    slug: "hard-announcement-kit",
    type: "playbook",
    pillar: "ic",
    title: "A hard announcement kit, hour by hour",
    summary:
      "How we would plan a hard announcement at a fictional 200-person scale-up: the message house, the manager cascade, the FAQ and the timing.",
    metaTitle: "Hard announcement kit: a playbook",
    metaDescription:
      "A hard announcement plan for a fictional 200-person scale-up: message house, manager cascade, FAQ and an hour-by-hour timing plan.",
    aiSummary:
      "Playbook, illustrative example, not client work. How The Magic Coffin would plan a hard announcement at a fictional 200-person scale-up: a message house, a manager cascade, an FAQ and a timing plan that runs from leadership two days before to a pulse check two weeks after.",
    honestyLabel: PLAYBOOK_LABEL,
    roleTitle: "The Magic Coffin playbook",
    year: "2026",
    tags: ["Change communication", "Manager cascade", "Playbook"],
    cardStyle: "dark",
    pullLine: "The people affected hear it first, from their own manager.",
    cover: {
      source: "Architecture/architecture-dark-corridor-people-walking-distant.jpg",
      alt: "People walking down a long dark corridor towards the light at the end.",
    },
    diagram: {
      kind: "flow",
      title: "The timing plan",
      nodes: [
        { label: "Two days before", note: "Leadership aligned" },
        { label: "Day before", note: "Managers briefed" },
        { label: "Hour 0", note: "People affected, from their manager" },
        { label: "Hour 1", note: "Everyone: live call, FAQ, email" },
        { label: "Two weeks on", note: "A note and a pulse check" },
      ],
    },
    proofs: [],
    featuredHome: false,
    related: ["sample-vigil", "manager-conversation-guide"],
    sections: [
      {
        kind: "text",
        eyebrow: "The scenario",
        title: "A fictional scale-up with news to share",
        paras: [
          "Lanternfish is a fictional 200-person scale-up. Its leaders have a decision to announce that changes some people's jobs. The order people hear it in decides how much trust is left on Monday.",
        ],
      },
      {
        kind: "steps",
        eyebrow: "The kit",
        title: "Four pieces, ready before anyone speaks",
        steps: [
          { title: "Message house", text: "One page with the core message, three supporting points and the facts behind each, so every leader says the same thing." },
          { title: "Manager cascade", text: "A briefing pack and a script for managers, with the likely questions and who answers what." },
          { title: "FAQ", text: "The questions people will ask in the first hour, answered in plain words, live when the all-hands ends." },
          { title: "Timing plan", text: "Hour by hour, so the people affected hear it first, from their own manager." },
        ],
      },
      { kind: "diagram", caption: "The timing plan, from two days before to two weeks after.", alt: "Timeline in five steps: leadership aligned two days before, managers briefed the day before, people affected told by their manager at hour 0, everyone told in a live call with FAQ and email at hour 1, a note and pulse check two weeks on." },
      {
        kind: "text",
        eyebrow: "How we would measure it",
        title: "Three signals in the first fortnight",
        paras: [
          "Questions to managers in the first 48 hours, views of the FAQ and the result of the pulse check two weeks on. Team check-ins run through the first 48 hours.",
          "This is how we run [The Burial](/services/internal-communications) and [The Resurrection](/services/internal-communications) when a hard moment is on the calendar. When the moment leans more HR than comms, [The Vigil](/work/sample-vigil/) covers the 72 hours around it.",
        ],
      },
    ],
    faq: [
      { q: "Who should hear a hard announcement first?", a: "Leadership two days before, managers the day before, then the people affected from their own manager, an hour before everyone else." },
      { q: "What goes in a hard announcement kit?", a: "A message house, a manager cascade, an FAQ and an hour-by-hour timing plan." },
      { q: "Is this a real company?", a: "Lanternfish is fictional. This is an illustrative example of how we would plan it." },
    ],
    questions: ["Happy with Lanternfish as the fictional company's name (reused on 16)?"],
  },

  /* ── 07 ─────────────────────────────────────────────────────────── */
  {
    n: 7,
    slug: "sample-autopsy",
    type: "playbook",
    pillar: "ic",
    title: "A sample Autopsy: the internal comms audit",
    summary:
      "Inside our internal comms audit: interviews, a channel audit, the top vampire moments and a 30/60/90 roadmap.",
    metaTitle: "Sample internal comms audit (The Autopsy)",
    metaDescription:
      "See inside an internal communications audit: interviews, a channel audit, the moments that drain trust and a 30/60/90 roadmap. From €900.",
    aiSummary:
      "Playbook, illustrative example, not client work. The Autopsy is The Magic Coffin's internal communications audit: interviews across three to five levels, a channel audit, the top vampire moments (where trust drains away) and a 30/60/90 day roadmap. From €900, two to three weeks. The sample is a four to six page excerpt of a 15 to 25 page report.",
    honestyLabel: PLAYBOOK_LABEL,
    roleTitle: "The Magic Coffin playbook",
    year: "2026",
    tags: ["Internal comms audit", "The Autopsy", "Playbook"],
    cardStyle: "dark",
    pullLine: "Lift the lid, name what's draining people, fix it in 90 days.",
    cover: {
      source: "Architecture/architecture-dark-concrete-room-light-beam.jpeg",
      alt: "A single beam of light falling into a bare concrete room.",
    },
    diagram: {
      kind: "doc",
      title: "Report excerpt",
      heading: "The Autopsy: findings (sample)",
      blocks: [
        { label: "Who we heard", lines: ["Interviews across three to five levels,", "from the leadership team to new joiners."] },
        { label: "Channel audit", lines: ["Every channel, its owner and its purpose,", "and where two channels say different things."] },
        { label: "Top vampire moments", lines: ["The moments that drain trust,", "ranked by how many people they touch."] },
        { label: "30/60/90 roadmap", lines: ["Quick fixes first, then the structure,", "then the habits that keep it working."] },
      ],
    },
    proofs: [],
    featuredHome: false,
    related: ["hard-announcement-kit", "town-halls"],
    sections: [
      {
        kind: "text",
        eyebrow: "The scenario",
        title: "What you get when you book The Autopsy",
        paras: [
          "Something is off: messages land flat and people know less about the company than its LinkedIn page does. The Autopsy finds where, in two to three weeks, from €900.",
        ],
      },
      {
        kind: "steps",
        eyebrow: "How we run it",
        title: "Four parts, one report",
        steps: [
          { title: "Interviews", text: "Conversations across three to five levels, so the report hears the new joiner as well as the leadership team." },
          { title: "Channel audit", text: "Every channel, who owns it, what it is for and where two channels say different things." },
          { title: "Vampire moments", text: "The handful of moments that drain trust, ranked by how many people they touch." },
          { title: "30/60/90 roadmap", text: "What to fix in the first month, what to build by the second and what to keep doing by the third." },
        ],
      },
      { kind: "diagram", caption: "A sample page from an Autopsy report.", alt: "A sample report page with four sections: who we heard, channel audit, top vampire moments and a 30/60/90 day roadmap." },
      {
        kind: "text",
        eyebrow: "What you keep",
        title: "A report your leadership team can act on",
        paras: [
          "The full report runs 15 to 25 pages. The sample here is a four to six page excerpt. Many clients move straight on to [The Burial](/services/internal-communications), the strategy and playbook.",
          "Some of what we look for comes from running [Town Halls](/work/town-halls/) and a [newsroom](/work/internal-newsroom/) in-house.",
        ],
      },
    ],
    faq: [
      { q: "How long does an internal communications audit take?", a: "Two to three weeks, around 15 to 20 hours of your team's time." },
      { q: "How much does The Autopsy cost?", a: "From €900." },
      { q: "What is a vampire moment?", a: "A moment in the working week that quietly drains trust or energy, such as news that reaches people second-hand." },
    ],
    questions: ["Do you want a downloadable PDF of the four to six page excerpt? It needs writing as a separate piece."],
  },

  /* ── 08 ─────────────────────────────────────────────────────────── */
  {
    n: 8,
    slug: "onboarding-buddy-programme",
    type: "case",
    pillar: "ex",
    title: "Onboarding and a Buddy Programme for ~300 hires",
    summary:
      "A global onboarding redesign: learning journeys in HowNow and an automated HiBob Buddy Programme for ~300 hires.",
    metaTitle: "Onboarding redesign for ~300 hires: a case study",
    metaDescription:
      "How a global onboarding redesign used HowNow learning journeys and an automated HiBob Buddy Programme for around 300 new hires.",
    aiSummary:
      `Case study. From October 2022 to March 2023, as Global People and Culture Trainee at ${CLIMATE}, Robert-Marian Stănescu led the redesign of global onboarding: role-specific learning journeys in HowNow LMS and a renamed Buddy Programme with automated workflows in HiBob and adoption targets that were met. Around 300 new hires went through it, and the social integration workflow ran the same way in every business unit.`,
    honestyLabel: "Real work, South Pole, 2022 to 2023",
    roleTitle: "Global People and Culture Trainee",
    year: "2022 to 2023",
    tags: ["Onboarding", "Buddy Programme", "HiBob", "HowNow"],
    cardStyle: "number",
    metric: "~300",
    metricLabel: "hires onboarded",
    pullLine: "Every new hire got a buddy, in every business unit, every time.",
    cover: {
      source: "People/people-silhouettes-group-backlit-hallway.jpg",
      alt: "A group of people in silhouette, backlit at the end of a hallway.",
      focusY: 0,
    },
    diagram: {
      kind: "flow",
      title: "The new hire's first weeks",
      nodes: [
        { label: "Offer signed", note: "HiBob starts the flow" },
        { label: "Buddy matched", note: "Automated in HiBob" },
        { label: "Day one", note: "Welcome and buddy intro" },
        { label: "Learning journey", note: "By role, in HowNow" },
        { label: "Check-in", note: "Buddy and manager" },
      ],
    },
    proofs: ["hires", "countries"],
    featuredHome: true,
    related: ["first-90-days", "recognition-platform"],
    sections: [
      {
        kind: "text",
        eyebrow: "The problem",
        title: "A buddy system that ran on memory",
        paras: [
          "Onboarding needed a full redesign. The Buddy Programme was a manual, bare-bones process, so whether a new hire got a buddy depended on someone remembering to set it up.",
          "On top of that, a lot of people wanted a say in the new design.",
        ],
      },
      {
        kind: "steps",
        eyebrow: "What Robert did",
        title: "One framework, many owners",
        steps: [
          { title: "Took the brief", text: "The redesign was assigned to Robert in his first role at the company, as a trainee." },
          { title: "Built learning journeys", text: "He set up role-specific onboarding journeys in HowNow LMS." },
          { title: "Automated the buddy match", text: "He built workflows in HiBob so every new hire got a buddy and the right prompts, without manual admin." },
          { title: "Gave it a new name", text: "He rebranded the Buddy Programme so people saw it as new, and set adoption targets for it, which it met." },
          { title: "Shared the ownership", text: "Each stakeholder owned their piece of the process, and Robert kept the overall framework. That settled the too-many-voices problem." },
        ],
      },
      { kind: "diagram", caption: "A new hire's first weeks after the redesign.", alt: "Diagram in five steps: offer signed and HiBob starts the flow, buddy matched automatically, day one welcome and buddy intro, role-specific learning journey in HowNow, check-in with buddy and manager." },
      {
        kind: "text",
        eyebrow: "What changed",
        title: "The same welcome everywhere",
        paras: [
          "Around 300 new hires went through the redesigned programme. The social integration workflow ran the same way in every business unit, every time, with no manual bottleneck.",
          "We use the same thinking for a new manager's [first 90 days](/work/first-90-days/).",
        ],
      },
    ],
    faq: [
      { q: "How do you automate a buddy programme?", a: "Here, workflows in HiBob matched each new hire with a buddy and sent both of them prompts, so it ran without manual admin." },
      { q: "How many people went through it?", a: "Around 300 new hires." },
    ],
    questions: [
      "What were the adoption targets (only if you want them named)?",
      "What was the programme's new name?",
      "Is the five-step flow in the diagram right (offer signed, buddy matched, day one, learning journey, check-in)?",
    ],
  },

  /* ── 09 ─────────────────────────────────────────────────────────── */
  {
    n: 9,
    slug: "enps-programme",
    type: "case",
    pillar: "ex",
    title: "An eNPS programme with 70%+ taking part",
    summary:
      "Robert designed and ran the company's eNPS surveys and built the readouts for leadership. Participation stayed above 70% through 2025.",
    metaTitle: "eNPS programme with 70%+ participation",
    metaDescription:
      "How an eNPS programme across 36 countries kept participation above 70% in 2025, and how each team took ownership of its own actions.",
    aiSummary:
      `Case study. At ${CLIMATE}, Robert-Marian Stănescu designed and administered the eNPS surveys and built the presentations and takeaways. The people analytics team ran the official analysis, his manager presented the findings to leadership, and the two of them agreed with leadership that each team would own its own actions. Participation stayed above 70% through every 2025 cycle.`,
    honestyLabel: "Real work, South Pole, 2023 to 2026",
    roleTitle: SPECIALIST,
    year: "2023 to 2026",
    tags: ["eNPS", "Engagement survey", "Listening"],
    cardStyle: "number",
    metric: "70%+",
    metricLabel: "eNPS participation in 2025",
    pullLine: "A survey only earns the next response if people see what changed.",
    cover: {
      source: "Abstract/abstract-glowing-heads-network-icon.jpg",
      alt: "Glowing outlines of heads linked together in a network.",
    },
    diagram: {
      kind: "flow",
      title: "One survey cycle",
      nodes: [
        { label: "Design", note: "Questions and timing" },
        { label: "Run", note: "Invite, remind, close" },
        { label: "Analyse", note: "People analytics team" },
        { label: "Read out", note: "Deck for leadership" },
        { label: "Act", note: "Each team owns its action" },
      ],
    },
    proofs: ["enps", "countries"],
    featuredHome: false,
    related: ["recognition-platform", "town-halls"],
    sections: [
      {
        kind: "text",
        eyebrow: "The problem",
        title: "Hearing a company that kept changing",
        paras: [
          `At ${CLIMATE}, leadership needed to know how people felt through a long stretch of change, and to act on it in a way people would notice.`,
        ],
      },
      {
        kind: "steps",
        eyebrow: "What Robert did",
        title: "From questions to team actions",
        steps: [
          { title: "Designed the survey", text: "He designed the eNPS surveys and set when each cycle ran." },
          { title: "Ran each cycle", text: "He administered every cycle, with reminders through the channels people read.", reconstructed: true },
          { title: "Built the readout", text: "The people analytics team ran the official analysis. Robert built the presentations and the takeaways." },
          { title: "Took it to leadership", text: "His manager presented the findings to the leadership team, and the two of them agreed with leadership how teams would act." },
          { title: "Handed actions to teams", text: "Each team owned its own action, in the way that suited its work." },
        ],
      },
      { kind: "diagram", caption: "One eNPS cycle, from design to team action.", alt: "Diagram in five steps: design the survey, run it with reminders, analysis by the people analytics team, readout deck for leadership, each team owns its action." },
      {
        kind: "text",
        eyebrow: "What changed",
        title: "People kept answering",
        paras: [
          "Participation stayed above 70% through every 2025 cycle, measured, in a company in 36 countries. People answer again when they see their team act on the last round.",
          "The listening sat beside a [peer recognition tool](/work/recognition-platform/) Robert built the same year.",
        ],
      },
    ],
    faq: [
      { q: "What is a good eNPS participation rate?", a: "This programme held above 70% through 2025 across 36 countries." },
      { q: "Who should own eNPS actions?", a: "Here each team owned its own action, agreed with leadership, which kept the changes close to the people who raised them." },
    ],
    questions: [
      "How did you get people to respond (reminders, managers, Town Halls)? The page guesses reminders through the channels people read.",
      "One example of a team action you are happy to share, anonymised?",
    ],
  },

  /* ── 10 ─────────────────────────────────────────────────────────── */
  {
    n: 10,
    slug: "recognition-platform",
    type: "case",
    pillar: "ex",
    title: "A kudos platform built with Google Apps Script",
    summary:
      "A company-wide kudos tool built in Google Workspace: a form, a Chat broadcast, a note to the manager and the values.",
    metaTitle: "Peer recognition tool in Google Apps Script",
    metaDescription:
      "How a company-wide kudos tool was built in Google Apps Script, Chat and Workspace with Gemini, and mapped each kudos to the company values.",
    aiSummary:
      `Case study. In 2025, at ${CLIMATE}, Robert-Marian Stănescu built a peer recognition platform from scratch in Google Apps Script, Google Chat and Google Workspace, using Gemini to speed up the build. A kudos form fed a Google Chat broadcast with reply threads, emailed the person's manager and mapped each kudos to a company value for performance reviews.`,
    honestyLabel: "Real work, South Pole, 2025",
    roleTitle: SPECIALIST,
    year: "2025",
    tags: ["Recognition", "Google Apps Script", "Gemini", "Automation"],
    cardStyle: "dark",
    pullLine: "Thanks that reach the team, the manager and the review.",
    cover: {
      source: "Neon-Signage/neon-sign-better-together.jpg",
      alt: "A neon sign on a dark wall that reads better together.",
    },
    diagram: {
      kind: "flow",
      title: "One kudos, four places",
      nodes: [
        { label: "Kudos form", note: "Who, what, which value" },
        { label: "Google Chat", note: "Broadcast with replies" },
        { label: "Manager email", note: "So it reaches the review" },
        { label: "Values sheet", note: "Kudos mapped to values" },
      ],
    },
    proofs: [],
    featuredHome: false,
    related: ["recognition-campaign", "enps-programme"],
    sections: [
      {
        kind: "text",
        eyebrow: "The problem",
        title: "Thanks that disappeared into a chat",
        paras: [
          "The company had no tool for peer recognition. Thank-yous happened in passing and were gone by review season, so the people doing good work had little written evidence of it.",
        ],
      },
      {
        kind: "steps",
        eyebrow: "What Robert did",
        title: "Built it in the tools people already had",
        steps: [
          { title: "Pulled in people data", text: "He linked a sheet of employee data so the form knew everyone and their manager." },
          { title: "Made a kudos form", text: "A short form: who, what they did and which company value it showed." },
          { title: "Broadcast it", text: "Each kudos went out in Google Chat with a reply thread, so colleagues could pile on." },
          { title: "Told the manager", text: "The manager got an email, so the thanks reached the person's review." },
          { title: "Mapped it to values", text: "Every kudos was tagged with a company value, as evidence for performance reviews." },
          { title: "Built it fast", text: "He wrote it in Google Apps Script and used Gemini to speed up the build." },
        ],
      },
      { kind: "diagram", caption: "Where one kudos goes.", alt: "Diagram in four steps: kudos form with who, what and which value; broadcast in Google Chat with replies; email to the manager; kudos mapped to company values in a sheet." },
      {
        kind: "text",
        eyebrow: "Where it got to",
        title: "Built and shipped",
        paras: [
          "The tool went live company-wide, built with the Google tools the company already paid for. Robert's role ended before usage could be reviewed, so this page shows how it works and leaves the numbers out.",
          "It followed the [anniversary recognition campaigns](/work/recognition-campaign/) and sat beside the [eNPS programme](/work/enps-programme/).",
        ],
      },
    ],
    faq: [
      { q: "Can you build a recognition tool in Google Workspace?", a: "Yes. This one used Google Apps Script, a form, Google Chat and email, with Gemini helping with the build." },
      { q: "How many people used it?", a: "There is no usage figure: Robert's role ended before usage was reviewed." },
    ],
    questions: ["Did the tool have a name?"],
  },

  /* ── 11 ─────────────────────────────────────────────────────────── */
  {
    n: 11,
    slug: "work-for-the-world",
    type: "artefact",
    pillar: "ex",
    title: "Work for the World: an employer brand campaign",
    summary:
      "Robert came up with the Work for the World concept, led the design, wrote the careers page copy and edited every video.",
    metaTitle: "Work for the World employer brand campaign",
    metaDescription:
      "The Work for the World employer brand campaign: concept, design lead, careers page copy and every video edit, still live in 2026.",
    aiSummary:
      "Artefact. Robert-Marian Stănescu came up with the Work for the World employer brand campaign for South Pole, a climate consultancy, led the design behind it and the careers page content, and edited all the campaign videos. The careers page was still live in August 2026.",
    honestyLabel: "Real work, South Pole, linked at the source",
    roleTitle: SPECIALIST,
    year: "2023 to 2026",
    tags: ["Employer brand", "Careers page", "Video"],
    cardStyle: "photo",
    pullLine: "A careers page that says what the work is for.",
    cover: {
      source: "Nature/nature-hands-planting-seedling-soil-closeup.jpg",
      alt: "Hands planting a seedling in dark soil.",
    },
    diagram: {
      kind: "flow",
      title: "From idea to careers page",
      nodes: [
        { label: "Concept", note: "Work for the World" },
        { label: "Design", note: "Look and structure" },
        { label: "Copy", note: "Careers page words" },
        { label: "Video", note: "Every edit" },
        { label: "Live", note: "Careers page" },
      ],
    },
    proofs: [],
    featuredHome: false,
    linkOut: "https://careers.southpole.com/",
    related: ["recognition-campaign", "onboarding-buddy-programme"],
    sections: [
      {
        kind: "text",
        eyebrow: "The brief",
        title: "Tell candidates what the work is for",
        paras: [
          "South Pole, a climate company, hires people who want their job to count. The careers page needed to say that plainly and show it.",
        ],
      },
      {
        kind: "steps",
        eyebrow: "What Robert did",
        title: "Concept, design, words and edit",
        steps: [
          { title: "Came up with the concept", text: "Work for the World started as Robert's idea." },
          { title: "Led the design", text: "He led the design behind the campaign and the careers page." },
          { title: "Wrote the page", text: "He wrote the careers page content." },
          { title: "Edited every video", text: "He edited all the campaign videos himself." },
        ],
      },
      { kind: "diagram", caption: "The campaign, from idea to the live careers page.", alt: "Diagram in five steps: the Work for the World concept, design, careers page copy, video editing, the live careers page." },
      {
        kind: "text",
        eyebrow: "See it",
        title: "Still live",
        paras: [
          "The careers page was still live in August 2026, and this page links to it. Candidates who join through a page like this meet the [onboarding](/work/onboarding-buddy-programme/) next.",
        ],
      },
    ],
    faq: [
      { q: "Who made Work for the World?", a: "Robert-Marian Stănescu came up with the concept, led the design, wrote the careers page content and edited all the videos." },
    ],
    questions: ["Is the careers page still live today, so the link works?", "Which year did it launch?"],
  },

  /* ── 12 ─────────────────────────────────────────────────────────── */
  {
    n: 12,
    slug: "self-service-tier",
    type: "case",
    pillar: "ops",
    title: "A self-service tier for employee questions",
    summary:
      "Tier 0 of a tiered query system in Jira for Legal, IT and Risk, and People and Culture, so routine answers reached people first.",
    metaTitle: "Self-service HR help desk tier in Jira",
    metaDescription:
      "How a Tier 0 self-service layer in Jira answered routine questions for Legal, IT and Risk, and People and Culture across 36 countries.",
    aiSummary:
      `Case study. At ${CLIMATE}, Robert-Marian Stănescu designed and ran Tier 0 of a tiered employee query system in Jira, covering Legal, IT and Risk, and People and Culture, with self-service answers for routine questions before they reached a person. It ran company-wide. No deflection figure was measured.`,
    honestyLabel: "Real work, South Pole, 2023 to 2026",
    roleTitle: SPECIALIST,
    year: "2023 to 2026",
    tags: ["Self-service", "Jira", "HR service delivery", "Tiered support"],
    cardStyle: "photo",
    pullLine: "The answer first, the person when you need one.",
    cover: {
      source: "Architecture/architecture-industrial-warehouse-light-beams.jpg",
      alt: "Beams of light falling through the roof of a large warehouse.",
    },
    diagram: {
      kind: "flow",
      title: "Where a question goes",
      nodes: [
        { label: "Question", note: "Any employee, any country" },
        { label: "Tier 0", note: "Self-service answer" },
        { label: "Tier 1", note: "The right team in Jira" },
        { label: "Tier 2", note: "Specialist" },
        { label: "Feedback", note: "New answers for Tier 0" },
      ],
    },
    proofs: ["countries"],
    featuredHome: true,
    related: ["sample-hibob-workflow", "mandatory-training"],
    sections: [
      {
        kind: "text",
        eyebrow: "The problem",
        title: "The same questions, asked one by one",
        paras: [
          "Employee questions to Legal, IT and Risk, and People and Culture arrived one at a time and landed on the same few people. Routine questions waited in line behind hard ones.",
        ],
      },
      {
        kind: "steps",
        eyebrow: "What Robert did",
        title: "Built the layer before the people",
        steps: [
          { title: "Mapped the questions", text: "He grouped the questions people asked most, by team.", reconstructed: true },
          { title: "Wrote the answers", text: "He built self-service resources for the routine ones." },
          { title: "Set up Tier 0 in Jira", text: "He designed and ran Tier 0, so people saw an answer before a ticket reached a person." },
          { title: "Routed the rest", text: "Anything Tier 0 could answer went no further. Everything else reached the right team in Jira.", reconstructed: true },
          { title: "Kept it current", text: "New questions from tickets became new Tier 0 answers.", reconstructed: true },
        ],
      },
      { kind: "diagram", caption: "How a question moves through the tiers.", alt: "Diagram in five steps: an employee asks a question, Tier 0 offers a self-service answer, Tier 1 routes it to the right team in Jira, Tier 2 goes to a specialist, and feedback turns new questions into Tier 0 answers." },
      {
        kind: "text",
        eyebrow: "What changed",
        title: "Answers first, company-wide",
        paras: [
          "Tier 0 ran company-wide across 36 countries, for three teams at once. The teams felt the load drop. The drop went unmeasured, so this page leaves the percentage out.",
          "This is the tiered self-service system we build in [The Reanimation](/services/people-operations).",
        ],
      },
    ],
    faq: [
      { q: "What is Tier 0 in HR service delivery?", a: "The self-service layer: answers people find themselves before a question becomes a ticket for a person." },
      { q: "Which teams did it cover?", a: "Legal, IT and Risk, and People and Culture, in Jira." },
    ],
    questions: [
      "Did you map the most common questions first, as written?",
      "How many tiers were there in total, and who owned Tier 1 and 2?",
      "Did new ticket questions become Tier 0 answers, as written?",
    ],
  },

  /* ── 13 ─────────────────────────────────────────────────────────── */
  {
    n: 13,
    slug: "mandatory-training",
    type: "case",
    pillar: "ops",
    title: "Mandatory training across 36 countries",
    summary:
      "Recurring HowNow modules on phishing, data protection, KYC, GDPR and inclusion, with completion and accuracy tracked everywhere.",
    metaTitle: "Mandatory compliance training in HowNow",
    metaDescription:
      "How recurring compliance training in HowNow covered phishing, data protection, KYC, GDPR and inclusion, with completion tracked in 36 countries.",
    aiSummary:
      `Case study. At ${CLIMATE}, Robert-Marian Stănescu built and switched on recurring mandatory training modules in HowNow LMS on phishing, data protection, KYC and GDPR, plus inclusion modules, and tracked completion and accuracy rates. Some inclusion training was written in-house, some outsourced and some licensed from OpenSesame.`,
    honestyLabel: "Real work, South Pole, 2023 to 2026",
    roleTitle: SPECIALIST,
    year: "2023 to 2026",
    tags: ["Compliance training", "HowNow", "LMS", "Inclusion"],
    cardStyle: "photo",
    pullLine: "Training that comes round on time, for everyone.",
    cover: {
      source: "Architecture/architecture-fluorescent-light-tubes-ceiling.jpg",
      alt: "Rows of fluorescent light tubes across a dark ceiling.",
    },
    diagram: {
      kind: "flow",
      title: "One training cycle",
      nodes: [
        { label: "Build", note: "Module in HowNow" },
        { label: "Assign", note: "By role and country" },
        { label: "Remind", note: "Before the deadline" },
        { label: "Track", note: "Completion and accuracy" },
        { label: "Repeat", note: "Next cycle" },
      ],
    },
    proofs: ["countries"],
    featuredHome: false,
    related: ["self-service-tier", "support-onboarding-curriculum"],
    sections: [
      {
        kind: "text",
        eyebrow: "The problem",
        title: "Rules that had to reach everyone, every year",
        paras: [
          "A company in 36 countries has to show that everyone knows how to spot a phishing email and handle personal data. The training had to come round on time and the records had to stand up.",
        ],
      },
      {
        kind: "steps",
        eyebrow: "What Robert did",
        title: "Recurring, tracked and built or bought",
        steps: [
          { title: "Built the modules", text: "He built and switched on recurring modules in HowNow LMS: phishing, data protection, KYC and GDPR." },
          { title: "Assigned by audience", text: "Each module went to the people it applied to, on a repeating schedule.", reconstructed: true },
          { title: "Tracked two numbers", text: "He tracked completion and accuracy, so the company knew who had done it and who had understood it." },
          { title: "Added inclusion training", text: "After specific leadership incidents, he set up harassment and inclusive-language training. He wrote some of it, outsourced some and licensed some from OpenSesame." },
        ],
      },
      { kind: "diagram", caption: "One mandatory training cycle.", alt: "Diagram in five steps: build the module in HowNow, assign it by role and country, send reminders before the deadline, track completion and accuracy, repeat next cycle." },
      {
        kind: "text",
        eyebrow: "What changed",
        title: "A programme that runs itself each year",
        paras: [
          "Mandatory training became a recurring programme, tracked in every country. The same build-or-buy judgement shows up in the [support onboarding curriculum](/work/support-onboarding-curriculum/).",
        ],
      },
    ],
    faq: [
      { q: "Should you build or buy compliance training?", a: "Both can work. Here some inclusion training was written in-house, some outsourced and some licensed from OpenSesame." },
      { q: "What should you track for mandatory training?", a: "Completion and accuracy: who finished it and who understood it." },
    ],
    questions: [
      "Were modules assigned by role and country on a repeating schedule, as written?",
      "The portfolio doc put the harassment and inclusive-language story on page 21; it sits here because it happened at the same company. OK?",
    ],
  },

  /* ── 14 ─────────────────────────────────────────────────────────── */
  {
    n: 14,
    slug: "org-chart-automation",
    type: "case",
    pillar: "ops",
    title: "An org chart that keeps itself up to date",
    summary:
      "A chain from HiBob to Google to LumApps, so the intranet org chart updates when the HR system does.",
    metaTitle: "Automated org chart: HiBob to Google to LumApps",
    metaDescription:
      "How an intranet org chart stays current by itself: people data flows from HiBob to Google and on to LumApps, company-wide.",
    aiSummary:
      `Case study. At ${CLIMATE}, Robert-Marian Stănescu set up an integration chain from HiBob to Google and from Google to LumApps, so the org chart on the intranet updates itself from the HR system. It ran company-wide as part of the LumApps rollout.`,
    honestyLabel: "Real work, South Pole, 2023 to 2026",
    roleTitle: SPECIALIST,
    year: "2023 to 2026",
    tags: ["Org chart", "HiBob", "LumApps", "Automation"],
    cardStyle: "photo",
    pullLine: "Change it once in HR, see it everywhere.",
    cover: {
      source: "Architecture/architecture-abstract-blue-white-grid-pattern.jpg",
      alt: "A blue and white grid of building panels, repeating into the distance.",
    },
    diagram: {
      kind: "flow",
      title: "The chain",
      nodes: [
        { label: "HiBob", note: "The source of truth" },
        { label: "Google", note: "Directory sync" },
        { label: "LumApps", note: "Org chart on the intranet" },
      ],
    },
    proofs: ["countries"],
    featuredHome: false,
    related: ["intranet-rebuild", "sample-hibob-workflow"],
    sections: [
      {
        kind: "text",
        eyebrow: "The problem",
        title: "An org chart out of date by Monday",
        paras: [
          "The new intranet needed an org chart people could trust. Kept by hand, it would be wrong after the next joiner, leaver or reorg.",
        ],
      },
      {
        kind: "steps",
        eyebrow: "What Robert did",
        title: "One source, two hops",
        steps: [
          { title: "Picked the source", text: "HiBob, the HR system, stayed the single place where reporting lines are changed." },
          { title: "Sent it to Google", text: "People data flowed from HiBob into the company's Google directory.", reconstructed: true },
          { title: "Read it in LumApps", text: "LumApps built the org chart from Google, so the intranet showed the same lines as HR." },
          { title: "Tested the edges", text: "He checked joiners, leavers and manager changes all the way through.", reconstructed: true },
        ],
      },
      { kind: "diagram", caption: "From HiBob, through Google, to the LumApps org chart.", alt: "Diagram in three steps: HiBob as the source of truth, Google directory sync, the org chart on the LumApps intranet." },
      {
        kind: "text",
        eyebrow: "What changed",
        title: "Change it once",
        paras: [
          "The org chart on the intranet updates itself when HR changes a record. It was part of the [intranet rebuild](/work/intranet-rebuild/).",
        ],
      },
    ],
    faq: [
      { q: "Can HiBob feed a LumApps org chart?", a: "Here it ran through Google: HiBob to Google, then Google to LumApps." },
    ],
    questions: [
      "Was the hop into Google the Google directory (Workspace) or a Google Sheet?",
      "Did you test joiners, leavers and manager changes end to end, as written?",
    ],
  },

  /* ── 15 ─────────────────────────────────────────────────────────── */
  {
    n: 15,
    slug: "sample-hibob-workflow",
    type: "artefact",
    pillar: "ops",
    title: "A HiBob workflow: promotion to pay rise, on time",
    summary:
      "A recreated workflow that takes a promotion from the manager's request to the right pay in the right payroll run.",
    metaTitle: "Sample HiBob promotion workflow",
    metaDescription:
      "A recreated HiBob workflow that takes a promotion from request to approval to the right pay in the right payroll run. Dummy data.",
    aiSummary:
      "Artefact, recreated with dummy data. A HiBob workflow that takes a promotion from a manager's request through approval and budget checks to a dated compensation change, the payroll export and the letter to the employee. It shows the kind of system The Magic Coffin builds in The Reanimation.",
    honestyLabel: RECREATED_LABEL,
    roleTitle: "The Magic Coffin sample",
    year: "2026",
    tags: ["HiBob", "Workflow", "Promotions", "Payroll"],
    cardStyle: "dark",
    pullLine: "A promotion should show up in the payslip the month it starts.",
    cover: {
      source: "Architecture/architecture-modern-glass-staircase-night.jpg",
      alt: "A glass staircase lit up at night.",
    },
    diagram: {
      kind: "flow",
      title: "Promotion workflow (dummy data)",
      nodes: [
        { label: "Request", note: "Manager proposes" },
        { label: "Approve", note: "People partner and leader" },
        { label: "Budget check", note: "Finance" },
        { label: "Change in HiBob", note: "Dated pay change" },
        { label: "Payroll", note: "Export before cut-off" },
        { label: "Letter", note: "To the employee" },
      ],
    },
    proofs: [],
    featuredHome: false,
    related: ["self-service-tier", "org-chart-automation"],
    sections: [
      {
        kind: "text",
        eyebrow: "The scenario",
        title: "A promotion that reaches the payslip",
        paras: [
          "A manager promotes someone in March. The pay rise should land in March too. In many scale-ups it lands in May, after three emails and a reminder.",
          "Robert spent years in HiBob and checked HiBob against payroll every month, so this sample is built from what he saw go wrong.",
        ],
      },
      {
        kind: "steps",
        eyebrow: "The workflow",
        title: "Six steps, each with an owner",
        steps: [
          { title: "Request", text: "The manager fills in one form: new title, new pay, start date." },
          { title: "Approve", text: "The people partner and the department leader approve in HiBob." },
          { title: "Check the budget", text: "Finance confirms the money is in the budget." },
          { title: "Change the record", text: "HiBob records the new title and pay with the right effective date." },
          { title: "Pay it", text: "The change goes into the payroll export before the cut-off." },
          { title: "Tell the person", text: "The employee gets the letter on the day it starts." },
        ],
      },
      { kind: "diagram", caption: "A recreated promotion workflow, with dummy data.", alt: "Workflow in six steps: manager request, approval by the people partner and leader, finance budget check, dated pay change in HiBob, payroll export before cut-off, letter to the employee." },
      {
        kind: "text",
        eyebrow: "Where it fits",
        title: "Part of The Reanimation",
        paras: [
          "This is the kind of system we build in [The Reanimation](/services/people-operations), next to a [self-service tier](/work/self-service-tier/) for the questions people ask.",
        ],
      },
    ],
    faq: [
      { q: "How do you make sure a promotion is paid on time?", a: "Give every step an owner and a date, record the change in HiBob with the effective date, and export it before the payroll cut-off." },
      { q: "Is this real client data?", a: "It is recreated with dummy data." },
    ],
    questions: ["Is the step order right for the way you would build it?"],
  },

  /* ── 16 ─────────────────────────────────────────────────────────── */
  {
    n: 16,
    slug: "sample-vigil",
    type: "playbook",
    pillar: "hrbp",
    title: "A sample Vigil: 72 hours around a hard moment",
    summary:
      "How we would support a fictional 200-person scale-up through one hard moment, hour by hour, as a fractional HR business partner.",
    metaTitle: "Sample Vigil: 72 hours of HRBP support",
    metaDescription:
      "How a fractional HR business partner would support a fictional 200-person scale-up through one hard moment in 72 hours. From €500 a day.",
    aiSummary:
      "Playbook, illustrative example, not client work. The Vigil is The Magic Coffin's single hard-moment support from a fractional HR business partner: one defined moment (a restructure, a difficult exit, a policy crisis) handled end to end. This sample follows a fictional 200-person scale-up through 72 hours. From €500 a day, with a three-day minimum.",
    honestyLabel: PLAYBOOK_LABEL,
    roleTitle: "The Magic Coffin playbook",
    year: "2026",
    tags: ["Fractional HRBP", "The Vigil", "Employee relations", "Playbook"],
    cardStyle: "dark",
    pullLine: "Someone who has done this before, in the room for three days.",
    cover: {
      source: "Architecture/architecture-empty-dark-room-chair-spotlight.jpg",
      alt: "A single chair under a spotlight in an empty dark room.",
    },
    diagram: {
      kind: "flow",
      title: "The 72 hours",
      nodes: [
        { label: "Hour 0 to 8", note: "Facts, risks, plan" },
        { label: "Hour 8 to 24", note: "Leaders and managers ready" },
        { label: "Day two", note: "The conversations" },
        { label: "Day three", note: "Follow-up and records" },
        { label: "After", note: "Handover note" },
      ],
    },
    proofs: ["people"],
    featuredHome: true,
    related: ["hard-announcement-kit", "manager-conversation-guide"],
    sections: [
      {
        kind: "text",
        eyebrow: "The scenario",
        title: "Lanternfish has a hard week ahead",
        paras: [
          "Lanternfish, a fictional 200-person scale-up, has no HR business partner. A team is being restructured and the founders want it done well, and quickly.",
        ],
      },
      {
        kind: "steps",
        eyebrow: "How we would run it",
        title: "Three days, one moment",
        steps: [
          { title: "Hours 0 to 8", text: "Get the facts, spot the legal and people risks, and agree one plan with the founders." },
          { title: "Hours 8 to 24", text: "Brief leaders and managers, write the scripts and prepare the [announcement kit](/work/hard-announcement-kit/)." },
          { title: "Day two", text: "Sit in on the hard conversations, support managers between them and answer questions as they come." },
          { title: "Day three", text: "Follow up with the people affected, close the records and check in with the team that stays." },
          { title: "Afterwards", text: "A handover note: what happened, what is still open and who owns it." },
        ],
      },
      { kind: "diagram", caption: "The 72 hours of a Vigil, from facts to handover.", alt: "Timeline in five steps: facts, risks and plan in hours 0 to 8; leaders and managers ready by hour 24; the conversations on day two; follow-up and records on day three; a handover note afterwards." },
      {
        kind: "text",
        eyebrow: "Where it comes from",
        title: "Built on years of hard moments",
        paras: [
          "Robert supported around 500 people across the employee lifecycle in-house before starting The Magic Coffin. [The Vigil](/services/fractional-hrbp) is from €500 a day, with a three-day minimum.",
          "Managers who want to get ahead of the moment can start with the [conversation guide](/work/manager-conversation-guide/).",
        ],
      },
    ],
    faq: [
      { q: "What is The Vigil?", a: "Single hard-moment support from a fractional HR business partner: one defined moment, handled end to end." },
      { q: "How much does The Vigil cost?", a: "From €500 a day, with a three-day minimum." },
      { q: "Is Lanternfish a real company?", a: "It is fictional. This is an illustrative example." },
    ],
    questions: [
      "Is restructuring the right scenario for the sample, or would you prefer a difficult exit?",
      "The page says you supported around 500 people in-house. Is that the right way to describe the ~500 proof point?",
    ],
  },

  /* ── 17 ─────────────────────────────────────────────────────────── */
  {
    n: 17,
    slug: "manager-conversation-guide",
    type: "playbook",
    pillar: "hrbp",
    title: "The conversation before someone resigns",
    summary:
      "A guide for managers on the talk to have when a good person seems ready to leave: what to ask, what to listen for and what to offer.",
    metaTitle: "Manager guide: the talk before a resignation",
    metaDescription:
      "A manager's guide to the conversation before someone resigns: what to ask, what to listen for and what you can offer. Not legal advice.",
    aiSummary:
      "Playbook, illustrative example, not client work, not legal advice. A guide for managers on the conversation to have when a good person seems ready to leave: how to open it, the questions to ask, what to listen for, what to offer and what to write down afterwards.",
    honestyLabel: `${PLAYBOOK_LABEL}. Not legal advice`,
    roleTitle: "The Magic Coffin playbook",
    year: "2026",
    tags: ["Retention", "Managers", "Stay conversation", "Playbook"],
    cardStyle: "dark",
    pullLine: "Ask before the letter arrives.",
    cover: {
      source: "Architecture/architecture-dark-conference-room-window-light.jpg",
      alt: "A dark meeting room with light coming in through one window.",
    },
    diagram: {
      kind: "doc",
      title: "One-page guide",
      heading: "The conversation before a resignation",
      blocks: [
        { label: "Open", lines: ["\"I'd like to hear how work is going", "for you. Honestly.\""] },
        { label: "Ask", lines: ["What would make you stay another year?", "What would you change tomorrow?"] },
        { label: "Listen for", lines: ["Workload, growth, pay, your own", "management, life outside work."] },
        { label: "After", lines: ["Write it down, agree one next step,", "come back within two weeks."] },
      ],
    },
    proofs: [],
    featuredHome: false,
    related: ["sample-vigil", "first-90-days"],
    sections: [
      {
        kind: "text",
        eyebrow: "The scenario",
        title: "A good person has gone quiet",
        paras: [
          "Their camera is off more. They stopped arguing in meetings. A manager who asks now has a chance; a manager who waits gets a letter.",
        ],
      },
      {
        kind: "steps",
        eyebrow: "The guide",
        title: "Open, ask, listen, follow up",
        steps: [
          { title: "Open plainly", text: "Say why you asked for the time: you want to hear how work is going for them." },
          { title: "Ask two questions", text: "What would make you stay another year? What would you change tomorrow?" },
          { title: "Listen for the reason", text: "Workload, growth, pay, your own management or life outside work. Each needs a different answer." },
          { title: "Offer what you can", text: "Only what you can deliver. Check pay and role questions with HR before promising anything." },
          { title: "Follow up", text: "Write it down, agree one next step and come back within two weeks." },
        ],
      },
      { kind: "diagram", caption: "The guide on one page.", alt: "A one-page guide in four parts: how to open the conversation, two questions to ask, what to listen for, and what to do after." },
      {
        kind: "text",
        eyebrow: "Where it fits",
        title: "Part of fractional HRBP support",
        paras: [
          "We coach managers through these talks in the [Fractional HRBP](/services/fractional-hrbp) retainer. New managers get it early in their [first 90 days](/work/first-90-days/). This guide is general and is not legal advice.",
        ],
      },
    ],
    faq: [
      { q: "What should a manager ask when someone might resign?", a: "What would make you stay another year, and what would you change tomorrow." },
      { q: "Is this legal advice?", a: "No. It is a general guide; check anything about pay, contracts or notice with HR or a lawyer." },
    ],
    questions: ["Anything from your own experience you'd add to the 'listen for' list?"],
  },

  /* ── 18 ─────────────────────────────────────────────────────────── */
  {
    n: 18,
    slug: "pay-readiness-check",
    type: "playbook",
    pillar: "pay",
    title: "A pay transparency readiness check",
    summary:
      "A fictional Stockholm scale-up checked against the EU Pay Transparency Directive, with a red, amber and green summary.",
    metaTitle: "Pay transparency readiness check: a sample",
    metaDescription:
      "A sample EU Pay Transparency Directive check for a fictional Stockholm scale-up: job ads, pay history, criteria and pay requests. Not legal advice.",
    aiSummary:
      "Playbook, illustrative example, not client work, not legal advice. The Magic Coffin's Pay Transparency Check (The Autopsy) on a fictional 120-person Stockholm SaaS scale-up: it checks pay ranges in job ads, pay history questions, gender-neutral pay criteria and how people can ask about pay levels, and ends with a red, amber and green summary and three fixes. From €750, one to two weeks, about 12 to 15 hours.",
    honestyLabel: `${PLAYBOOK_LABEL}. Not legal advice`,
    roleTitle: "The Magic Coffin playbook",
    year: "2026",
    tags: ["Pay transparency", "EU directive", "The Autopsy", "Playbook"],
    cardStyle: "dark",
    pullLine: "Know where you stand before the rules arrive.",
    cover: {
      source: "Abstract/abstract-hourglass-sand-timer-dark-background.jpg",
      alt: "An hourglass with sand running through, on a dark background.",
    },
    diagram: {
      kind: "rag",
      title: "Readiness summary (fictional company)",
      rows: [
        { check: "Pay ranges in job ads", status: "red", note: "Ads give no range" },
        { check: "Pay history questions", status: "amber", note: "Asked in one interview script" },
        { check: "Gender-neutral criteria", status: "amber", note: "Levels exist, criteria unwritten" },
        { check: "Asking about pay levels", status: "green", note: "Process and owner in place" },
      ],
    },
    proofs: [],
    featuredHome: true,
    related: ["pay-range-explainer", "sample-autopsy"],
    sections: [
      {
        kind: "text",
        eyebrow: "The scenario",
        title: "A Stockholm scale-up with a deadline",
        paras: [
          "Kvarnby Software is a fictional 120-person SaaS scale-up in Stockholm. Its founders know the EU Pay Transparency Directive is coming and want to know how far they have to go.",
        ],
      },
      {
        kind: "steps",
        eyebrow: "What we check",
        title: "Four checks, one summary",
        steps: [
          { title: "Job ads", text: "Do the ads or the first interview give a pay range?" },
          { title: "Pay history", text: "Does anyone still ask candidates what they earn now?" },
          { title: "Criteria", text: "Are pay and progression set on gender-neutral criteria: skills, effort, responsibility and working conditions?" },
          { title: "Pay requests", text: "Can people ask about pay levels, and does someone own the answer?" },
        ],
      },
      { kind: "diagram", caption: "A sample red, amber and green summary for a fictional company.", alt: "A traffic-light table for a fictional company: pay ranges in job ads red, pay history questions amber, gender-neutral criteria amber, asking about pay levels green." },
      {
        kind: "text",
        eyebrow: "What you get",
        title: "A summary and three fixes",
        paras: [
          "A red, amber and green summary, and the three fixes that move the most red to green. [The Autopsy for pay transparency](/services/pay-transparency) runs from €750, over one to two weeks and about 12 to 15 hours.",
          "Directive dates and national rules are checked on the day each report goes out. This sample is general and is not legal advice. Next comes explaining the bands to staff: see the [pay-range explainer](/work/pay-range-explainer/).",
        ],
      },
    ],
    faq: [
      { q: "What does a pay transparency readiness check cover?", a: "Pay ranges in job ads, pay history questions, gender-neutral pay criteria and how people can ask about pay levels." },
      { q: "How long does it take?", a: "One to two weeks, about 12 to 15 hours, from €750." },
      { q: "Is this legal advice?", a: "No. It is a general sample; dates and national rules are checked on the day each report is issued." },
    ],
    questions: ["Happy with Kvarnby Software as the fictional company's name?"],
  },

  /* ── 19 ─────────────────────────────────────────────────────────── */
  {
    n: 19,
    slug: "pay-range-explainer",
    type: "artefact",
    pillar: "pay",
    title: "A pay-range explainer staff can read in five minutes",
    summary:
      "A recreated one-page explainer with dummy bands, plus the manager FAQ that goes with it.",
    metaTitle: "Pay-range explainer for staff: a sample",
    metaDescription:
      "A one-page pay-range explainer and manager FAQ, with dummy pay bands, so staff know how pay works. Recreated sample, not legal advice.",
    aiSummary:
      "Artefact, recreated with dummy data, not legal advice. A one-page explainer that tells staff how pay ranges work, with dummy bands, plus a manager FAQ for the questions that follow. It is the kind of material The Magic Coffin writes in The Reckoning, from €1,400.",
    honestyLabel: `${RECREATED_LABEL}. Not legal advice`,
    roleTitle: "The Magic Coffin sample",
    year: "2026",
    tags: ["Pay transparency", "Pay bands", "The Reckoning"],
    cardStyle: "dark",
    pullLine: "A pay band is finished when people can explain their own.",
    cover: {
      source: "Abstract/abstract-rainbow-prism-triangle.jpg",
      alt: "A glass prism splitting white light into a band of colour.",
    },
    diagram: {
      kind: "doc",
      title: "One-page explainer (dummy bands)",
      heading: "How pay works here",
      blocks: [
        { label: "Your level", lines: ["Every role sits on a level, L1 to L5,", "set by skills, effort and responsibility."] },
        { label: "Your band", lines: ["L3 (dummy): SEK 48,000 to 58,000 a month.", "Midpoint SEK 53,000."] },
        { label: "Moving up", lines: ["Within the band at review time,", "to the next level by promotion."] },
        { label: "Ask", lines: ["You can ask for the pay levels for your", "level. Your manager answers in two months."] },
      ],
    },
    proofs: [],
    featuredHome: false,
    related: ["pay-readiness-check", "manager-conversation-guide"],
    sections: [
      {
        kind: "text",
        eyebrow: "The brief",
        title: "Bands people understand",
        paras: [
          "A pay structure works once people understand it. The explainer is the page staff read; the FAQ is what their manager says when they ask why.",
        ],
      },
      {
        kind: "steps",
        eyebrow: "What is in it",
        title: "One page and one FAQ",
        steps: [
          { title: "Your level", text: "What a level is and what sets it." },
          { title: "Your band", text: "The range for each level, shown with dummy numbers here." },
          { title: "Moving up", text: "How pay moves inside a band and between levels." },
          { title: "How to ask", text: "How to ask about pay levels, who answers and by when." },
          { title: "Manager FAQ", text: "Ten questions managers get after the explainer goes out, with plain answers." },
        ],
      },
      { kind: "diagram", caption: "A recreated one-page explainer with dummy bands.", alt: "A one-page pay explainer in four parts: your level, your band with dummy figures, moving up, and how to ask about pay levels." },
      {
        kind: "text",
        eyebrow: "Where it fits",
        title: "Part of The Reckoning",
        paras: [
          "We write this in [The Reckoning](/services/pay-transparency), from €1,400, after the [readiness check](/work/pay-readiness-check/) and the bands are set. All figures here are dummy data, and the sample is general and is not legal advice.",
        ],
      },
    ],
    faq: [
      { q: "What should a pay-range explainer include?", a: "What a level is, the band for each level, how pay moves and how to ask about pay levels." },
      { q: "Are these real pay bands?", a: "No. They are dummy data for the sample." },
    ],
    questions: ["Is SEK the right currency for the dummy bands, or would you prefer euros?"],
  },

  /* ── 20 ─────────────────────────────────────────────────────────── */
  {
    n: 20,
    slug: "first-90-days",
    type: "playbook",
    pillar: "mgr",
    title: "A new manager's first 90 days",
    summary:
      "A 90-day plan for someone managing people for the first time: weeks one and two, three to six, and seven to twelve.",
    metaTitle: "A new manager's first 90 days: a playbook",
    metaDescription:
      "A first-time manager's 90-day plan in three stages: listen, set the rhythm, then grow the team. From The Grimoire and The Night School.",
    aiSummary:
      "Playbook, illustrative example, not client work. A 90-day plan for first-time managers in three stages: weeks one and two (listen and learn), weeks three to six (set the rhythm) and weeks seven to twelve (grow the team). It is built from The Magic Coffin's manager starter kit, The Grimoire (from €900), and the monthly clinic, The Night School (from €400 a month).",
    honestyLabel: PLAYBOOK_LABEL,
    roleTitle: "The Magic Coffin playbook",
    year: "2026",
    tags: ["New managers", "The Grimoire", "The Night School", "Playbook"],
    cardStyle: "dark",
    pullLine: "Managers are made. Ninety days gets you most of the way.",
    cover: {
      source: "People/people-flashlight-beam-milky-way-night.jpg",
      alt: "A person shining a torch beam up into the Milky Way at night.",
    },
    diagram: {
      kind: "flow",
      title: "The first 90 days",
      nodes: [
        { label: "Weeks 1 and 2", note: "Listen and learn" },
        { label: "Weeks 3 to 6", note: "Set the rhythm" },
        { label: "Weeks 7 to 12", note: "Grow the team" },
      ],
    },
    proofs: [],
    featuredHome: true,
    related: ["onboarding-buddy-programme", "manager-conversation-guide"],
    sections: [
      {
        kind: "text",
        eyebrow: "The scenario",
        title: "Promoted on Friday, managing on Monday",
        paras: [
          "Most new managers are promoted for being good at the job they just left. The first 90 days decide whether the team gets a manager or a very busy colleague.",
        ],
      },
      {
        kind: "steps",
        eyebrow: "The plan",
        title: "Three stages",
        steps: [
          { title: "Weeks 1 and 2: listen", text: "A one-to-one with everyone, the same five questions each time, and a page of what you heard." },
          { title: "Weeks 3 to 6: set the rhythm", text: "Weekly one-to-ones, one team meeting with a fixed agenda and clear owners for the work." },
          { title: "Weeks 7 to 12: grow the team", text: "First feedback both ways, one development goal per person and the [conversation before a resignation](/work/manager-conversation-guide/), practised." },
        ],
      },
      { kind: "diagram", caption: "The first 90 days in three stages.", alt: "Diagram in three stages: weeks one and two, listen and learn; weeks three to six, set the rhythm; weeks seven to twelve, grow the team." },
      {
        kind: "text",
        eyebrow: "Where it fits",
        title: "The Grimoire and The Night School",
        paras: [
          "[The Grimoire](/services/manager-enablement) turns this plan into a kit with your company's tools and tone, from €900. [The Night School](/services/manager-enablement) keeps the habits going with a monthly clinic, from €400 a month.",
          "It borrows from the [onboarding programme](/work/onboarding-buddy-programme/) Robert built for around 300 new hires.",
        ],
      },
    ],
    faq: [
      { q: "What should a new manager do in the first 90 days?", a: "Listen in weeks one and two, set the team's rhythm in weeks three to six and grow the team in weeks seven to twelve." },
      { q: "How much do The Grimoire and The Night School cost?", a: "The Grimoire is from €900. The Night School is from €400 a month." },
    ],
    questions: ["Are the five listening questions worth printing on the page? We can write them."],
  },

  /* ── 21 ─────────────────────────────────────────────────────────── */
  {
    n: 21,
    slug: "support-onboarding-curriculum",
    type: "case",
    pillar: "mgr",
    title: "A two-week curriculum for support agents",
    summary:
      "A two-week onboarding curriculum for about 30 customer support agents at Klarna, with coaching built on quality audits.",
    metaTitle: "Two-week support agent onboarding curriculum",
    metaDescription:
      "How a two-week curriculum and audit-led coaching trained about 30 support agents at Klarna, using Freshdesk Quality, QlikSense and Splunk.",
    aiSummary:
      "Case study. As Quality Process Analyst and Training Specialist at Klarna, the Swedish fintech (2021 to 2022), Robert-Marian Stănescu designed a two-week onboarding curriculum for new support cohorts on investigation skills and customer empathy, and coached about 30 agents one to one from quality audits in Freshdesk Quality, QlikSense and Splunk. The work also changed a write-off routine so agents could settle more standard cases without a manager's sign-off.",
    honestyLabel: "Real work, Klarna, 2021 to 2022",
    roleTitle: "Quality Process Analyst and Training Specialist",
    year: "2021 to 2022",
    tags: ["Training design", "Coaching", "Customer support", "Quality"],
    cardStyle: "photo",
    pullLine: "Coach the skill the audit shows is missing.",
    cover: {
      source: "People/people-silhouette-person-walking-dark-office.jpg",
      alt: "A person in silhouette walking through a dark office.",
    },
    diagram: {
      kind: "flow",
      title: "From audit to coaching",
      nodes: [
        { label: "Two-week curriculum", note: "Investigation and empathy" },
        { label: "Quality audits", note: "Freshdesk Quality" },
        { label: "Find the gaps", note: "QlikSense and Splunk" },
        { label: "Coach one to one", note: "The skill that's missing" },
        { label: "Fix the process", note: "Write-off routine" },
      ],
    },
    proofs: [],
    featuredHome: false,
    related: ["mandatory-training", "first-90-days"],
    sections: [
      {
        kind: "text",
        eyebrow: "The problem",
        title: "New agents learning on live customers",
        paras: [
          "A UK support team at Klarna needed new agents to investigate cases well and treat customers with care from week one. Coaching happened when someone had time.",
        ],
      },
      {
        kind: "steps",
        eyebrow: "What Robert did",
        title: "Curriculum first, then coaching from the data",
        steps: [
          { title: "Wrote the curriculum", text: "A two-week onboarding programme for each new cohort, on investigation skills and customer empathy." },
          { title: "Audited the work", text: "He ran quality audits in Freshdesk Quality." },
          { title: "Found the gaps", text: "He used QlikSense and Splunk to see which skills were missing, and where." },
          { title: "Coached one to one", text: "Each of about 30 agents got coaching on what their audits showed." },
          { title: "Changed the process", text: "He pushed a change to the write-off routine, so agents could settle more standard cases without waiting for a manager." },
        ],
      },
      { kind: "diagram", caption: "From the curriculum to audit-led coaching.", alt: "Diagram in five steps: a two-week curriculum on investigation and empathy, quality audits in Freshdesk Quality, finding gaps in QlikSense and Splunk, one-to-one coaching, and a change to the write-off routine." },
      {
        kind: "text",
        eyebrow: "What changed",
        title: "Better calls, fewer bottlenecks",
        paras: [
          "Customer satisfaction went up with agents' professionalism and empathy (no exact figure is on record, so none is shown here). Fewer standard cases waited for a manager. Robert was promoted to Business Operations Associate on the strength of this work.",
          "The same habit of building, then measuring, then coaching runs through the [mandatory training](/work/mandatory-training/) and the [first 90 days](/work/first-90-days/) plan for managers.",
        ],
      },
    ],
    faq: [
      { q: "How long should onboarding for support agents be?", a: "Here it was a two-week curriculum per cohort, followed by coaching from quality audits." },
      { q: "Which tools did the coaching use?", a: "Freshdesk Quality for audits, and QlikSense and Splunk to find skill gaps." },
    ],
    questions: [
      "This sits under Manager Enablement as the doc set it. Would People Operations suit it better?",
    ],
  },
];
