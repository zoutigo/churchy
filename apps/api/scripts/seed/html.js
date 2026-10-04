/** Petits constructeurs de HTML (balises autorisées par le texte riche de l'application). */
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const p = (t) => `<p>${t}</p>`;
const lines = (arr) => `<p>${arr.map(esc).join('<br>')}</p>`;
const strong = (t) => `<strong>${t}</strong>`;
const em = (t) => `<em>${t}</em>`;
const h3 = (t) => `<h3>${t}</h3>`;
const ul = (items) => `<ul>${items.map((i) => `<li>${i}</li>`).join('')}</ul>`;

/** Chant : moment de la messe, refrain, couplets (tableaux de lignes). */
function song(moment, refrain, couplets) {
  return [
    p(em(moment)),
    p(strong('Refrain')),
    lines(refrain),
    ...couplets.flatMap((c, i) => [p(strong(`Couplet ${i + 1}`)), lines(c)]),
  ].join('');
}

module.exports = { p, lines, strong, em, h3, ul, song, esc };
