// Set published to true and supply a URL when a week's slides are ready.
// Only files inside docs/ are deployed by the GitHub Pages workflow.
const courseWeeks = [
  { week: 1, topic: 'Course orientation, assessment, and logistics', slideUrl: 'slides/week-1.pdf', published: true },
  { week: 2, topic: 'Business understanding and requirements', slideUrl: null, published: false },
  { week: 3, topic: 'Data acquisition and understanding', slideUrl: null, published: false },
  { week: 4, topic: 'Data preparation and quality', slideUrl: null, published: false },
  { week: 5, topic: 'Retention performance', slideUrl: null, published: false },
  { week: 6, topic: 'Early warning signals and stakeholder review', slideUrl: null, published: false },
  { week: 7, topic: 'Baseline and simple modeling', slideUrl: null, published: false },
  { week: 8, topic: 'Technical and business evaluation', slideUrl: null, published: false },
  { week: 9, topic: 'Communication, delivery, and monitoring', slideUrl: null, published: false },
  { week: 10, topic: 'Stakeholder acceptance and reflection', slideUrl: null, published: false },
  { week: 11, topic: 'Project finalization', slideUrl: null, published: false },
  { week: 12, topic: 'Project finalization', slideUrl: null, published: false },
  { week: 13, topic: 'Project finalization', slideUrl: null, published: false },
  { week: 13.5, topic: 'Project finalization and submission', slideUrl: null, published: false },
];

const rows = courseWeeks.map(({ week, topic, slideUrl, published }) => {
  const row = document.createElement('tr');
  const number = document.createElement('th');
  number.scope = 'row';
  number.textContent = String(week).padStart(2, '0');
  const title = document.createElement('td');
  title.textContent = topic;
  const slides = document.createElement('td');
  let url;
  try { if (slideUrl) url = new URL(slideUrl, document.baseURI); } catch { /* Invalid links stay hidden. */ }
  if (published && url && ['http:', 'https:'].includes(url.protocol)) {
    const link = document.createElement('a');
    link.href = url.href;
    link.textContent = 'View slides';
    link.setAttribute('aria-label', `View slides for week ${week}: ${topic}`);
    slides.append(link);
  } else {
    const status = document.createElement('span');
    status.className = 'hidden-status';
    status.textContent = 'Hidden';
    slides.append(status);
  }
  row.append(number, title, slides);
  return row;
});
document.getElementById('schedule').replaceChildren(...rows);
const released = rows.filter(row => row.querySelector('a')).length;
document.querySelector('.release-note').textContent = released
  ? `${released} of ${courseWeeks.length} slide sets available`
  : 'Slides are currently hidden';
