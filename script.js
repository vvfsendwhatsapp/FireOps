document.addEventListener("DOMContentLoaded", () => {
    const modal = document.getElementById("modal-comando");
    const selectComando = document.getElementById("select-comando");
    const btnConferma = document.getElementById("btn-conferma-comando");
    const displayComando = document.getElementById("display-comando");
    
    // 1. Caricamento e parsing del file comandi.csv
    fetch("db/comandi.csv")
        .then(response => {
            if (!response.ok) throw new Error("Impossibile trovare il file comandi.csv");
            return response.text();
        })
        .then(data => {
            const lines = data.split("\n");
            let columnIndex = -1;
            
            // Analisi dell'intestazione per trovare la colonna "Comando"
            if (lines.length > 0) {
                const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ''));
                columnIndex = headers.findIndex(h => h.toLowerCase() === "Comando");
            }

            if (columnIndex === -1) {
                throw new Error("Colonna 'Comando' non trovata nel file CSV");
            }

            // Popolamento della select
            selectComando.innerHTML = '<option value="" disabled selected>-- Seleziona Comando --</option>';
            
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (line) {
                    // Gestione base per eventuali virgolette nel CSV
                    const cols = line.split(",").map(c => c.trim().replace(/^"|"$/g, ''));
                    const comandoVal = cols[columnIndex];
                    
                    if (comandoVal) {
                        const option = document.createElement("option");
                        option.value = comandoVal;
                        option.textContent = comandoVal;
                        selectComando.appendChild(option);
                    }
                }
            }
            
            selectComando.disabled = false;
        })
        .catch(error => {
            console.error("Errore:", error);
            selectComando.innerHTML = '<option value="" disabled selected>Errore caricamento comandi</option>';
        });

    // Abilita il pulsante di conferma solo quando viene fatta una scelta
    selectComando.addEventListener("change", () => {
        if (selectComando.value) {
            btnConferma.disabled = false;
        }
    });

    // Chiusura modale e blocco impostazione
    btnConferma.addEventListener("click", () => {
        const scelto = selectComando.value;
        if (scelto) {
            displayComando.textContent = scelto;
            modal.style.display = "none";
        }
    });

    // 2. Orologio in tempo reale in CEST e Turno VVF 12/24/12/48
    function updateClockAndShift() {
        const now = new Date();
        
        // Formattazione Data e Ora in tempo reale con fuso orario CEST/CET gestito nativamente
        const options = { 
            timeZone: 'Europe/Rome', 
            year: 'numeric', 
            month: '2-digit', 
            day: '2-digit', 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit',
            hour12: false 
        };
        
        const formatter = new Intl.DateTimeFormat('it-IT', options);
        document.getElementById("display-datetime").textContent = formatter.format(now);

        // Calcolo Turno VVF (12/24/12/48)
        // Data di riferimento nota (es. un giorno in cui il turno A o B era attivo)
        // Regola standard ciclica a 4 turni (A, B, C, D) con sequenza 12 smonto/24/12 smonto/48
        document.getElementById("display-turno").textContent = calcolaTurnoVVF(now);
    }

    function calcolaTurnoVVF(date) {
        // Data ancora di riferimento fissa (es. 1 Gennaio 2026 a mezzanotte)
        const baseDate = new Date(2026, 0, 1, 8, 0, 0); 
        const diffHours = (date - baseDate) / (1000 * 60 * 60);
        
        if (diffHours < 0) return "Turno 1 / 2"; // Gestione date antecedenti
        
        // Ciclo totale di rotazione standard VVF (96 ore = 4 giorni)
        const cycleHours = 96;
        const currentCycleHour = diffHours % cycleHours;
        
        // Semplificazione indicativa dello stato turno basata sulle fasce orarie standard 08:00 - 20:00 (Smonto/Notte)
        // Restituisce una stringa chiara dello stato turno corrente
        const hour = date.getHours();
        if (currentCycleHour < 12) return "Smonto / SM";
        else if (currentCycleHour < 36) return "Ripposo / 24";
        else if (currentCycleHour < 48) return "Smonto / SM";
        else return "Servizio / 48";
    }

    setInterval(updateClockAndShift, 1000);
    updateClockAndShift();
});
