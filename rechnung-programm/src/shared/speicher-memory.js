// Speicher im Arbeitsspeicher (Test-Version im Browser und Tests). Gleiche Schnittstelle wie der SQLite-Speicher.
export function erstelleMemorySpeicher(start = {}, { beiAenderung } = {}) {
  let zustand = normalisiere(start);
  let tiefe = 0;
  let geaendert = false;

  function normalisiere(z) {
    return { sammlungen: z.sammlungen || {}, einstellungen: z.einstellungen || null, protokoll: z.protokoll || [] };
  }
  const kopie = (x) => (x === undefined ? x : JSON.parse(JSON.stringify(x)));
  const liste = (col) => (zustand.sammlungen[col] ||= {});
  const markiere = () => {
    geaendert = true;
    if (!tiefe) melde();
  };
  const melde = () => {
    if (geaendert && beiAenderung) beiAenderung(zustand);
    geaendert = false;
  };

  return {
    alle: (col, { mitGeloeschten = false } = {}) => Object.values(liste(col)).filter((x) => mitGeloeschten || !x.geloescht).map(kopie),
    hole: (col, id) => kopie(liste(col)[id]) || null,
    schreibe(col, obj) {
      liste(col)[obj.id] = kopie(obj);
      markiere();
    },
    einstellungen: () => kopie(zustand.einstellungen),
    setzeEinstellungen(s) {
      zustand.einstellungen = kopie(s);
      markiere();
    },
    protokolliere(e) {
      zustand.protokoll.push({ id: zustand.protokoll.length + 1, ...e });
      if (zustand.protokoll.length > 5000) zustand.protokoll.splice(0, zustand.protokoll.length - 5000);
      markiere();
    },
    protokoll({ kundeId, objektId, limit = 200 } = {}) {
      return zustand.protokoll
        .filter((e) => (!kundeId || e.kundeId === kundeId) && (!objektId || e.objektId === objektId))
        .slice(-limit)
        .reverse()
        .map(kopie);
    },
    // Alles oder nichts: bei einem Fehler wird der vorige Zustand wiederhergestellt
    transaktion(fn) {
      const sicherung = tiefe === 0 ? kopie(zustand) : null;
      tiefe += 1;
      try {
        const r = fn();
        tiefe -= 1;
        if (!tiefe) melde();
        return r;
      } catch (e) {
        tiefe -= 1;
        if (sicherung) {
          zustand = sicherung;
          geaendert = false;
        }
        throw e;
      }
    },
    exportiere: () => kopie(zustand),
    ersetze(z) {
      zustand = normalisiere(kopie(z));
      geaendert = true;
      melde();
    }
  };
}
