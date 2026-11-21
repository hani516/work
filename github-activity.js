const contributionFigure = document.querySelector('#github-activity');

async function showContributionCalendar(figure) {
  try {
    const response = await fetch(figure.dataset.calendarUrl);
    if (!response.ok) return;
    const { start, levels } = await response.json();
    const firstDay = new Date(`${start}T00:00:00Z`);
    if (Number.isNaN(firstDay.getTime()) ||
        !Array.isArray(levels) || levels.length !== 365 ||
        !levels.every(level => Number.isInteger(level) && level >= 0 && level <= 4)) return;

    const calendar = figure.querySelector('svg');
    const offset = firstDay.getUTCDay();
    const columns = Math.ceil((offset + levels.length) / 7);
    calendar.setAttribute('viewBox', `0 0 ${columns * 10 - 2} 68`);
    const squares = document.createDocumentFragment();
    levels.forEach((level, index) => {
      const cell = offset + index;
      const square = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      square.setAttribute('x', Math.floor(cell / 7) * 10);
      square.setAttribute('y', (cell % 7) * 10);
      square.setAttribute('width', '8');
      square.setAttribute('height', '8');
      square.setAttribute('rx', '2');
      square.dataset.level = level;
      squares.append(square);
    });
    calendar.replaceChildren(squares);
    figure.hidden = false;
  } catch {
    // The About section stays readable when the calendar is unavailable.
  }
}

if (contributionFigure) showContributionCalendar(contributionFigure);
