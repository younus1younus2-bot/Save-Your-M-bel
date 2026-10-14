// Ersatz-PDF im Browser (html2pdf), wenn der Server kein PDF erzeugen kann oder in der Test-Version
import { renderDokument } from '../shared/vorlagen.js';

export async function pdfImBrowser(doc, settings, fertigesHtml) {
  if (!window.html2pdf) throw new Error('PDF-Erzeugung ist gerade nicht verfügbar.');
  const holder = document.createElement('div');
  holder.className = 'pdf-holder';
  holder.innerHTML = fertigesHtml || renderDokument(doc, settings);
  // knapp unter A4-Höhe, sonst entsteht durch Rundung eine leere Zusatzseite
  holder.firstElementChild.style.minHeight = '294mm';
  document.body.appendChild(holder);
  try {
    return await window
      .html2pdf()
      .set({
        margin: 0,
        image: { type: 'jpeg', quality: 0.95 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['css', 'legacy'], avoid: ['tr', '.d-summen-wrap', '.d-anzahlung', '.s-summen', '.e-termin'] }
      })
      .from(holder.firstElementChild)
      .outputPdf('blob');
  } finally {
    holder.remove();
  }
}
