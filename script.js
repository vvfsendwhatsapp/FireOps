document.addEventListener("DOMContentLoaded", () => {
    const modal = document.getElementById("modal-comando");
    const selectComando = document.getElementById("select-comando");
    const btnConferma = document.getElementById("btn-conferma-comando");
    const displayComando = document.getElementById("display-comando");
    
    // Caricamento pulito del file JSON (senza logiche da CSV)
    fetch("/FireOps/db/comandi.json")
        .then(response => {
            if (!response.ok) throw new Error("Impossibile trovare il file db/comandi.json");
            return response.json();
        })
        .then(comandi => {
            // Pulisce e popola la select direttamente con gli elementi del JSON
            selectComando.innerHTML = '<option value="" disabled selected>-- Seleziona Comando --</option>';
            
            comandi.forEach(comando => {
                const option = document.createElement("option");
                
                // Cerca la proprietà giusta dentro l'oggetto JSON (adatta se si chiama diversamente)
                const nomeComando = comando.nome || comando.Comando || comando.id;
                
                if (nomeComando) {
                    option.value = nomeComando;
                    option.textContent = nomeComando;
                    selectComando.appendChild(option);
                }
            });
            
            selectComando.disabled = false;
        })
        .catch(error => {
            console.error("Errore nel fetch del JSON:", error);
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

    // Orologio in tempo reale e Turno VVF
    function updateClockAndShift() {
        const now = new Date();
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
        document.getElementById("display-turno").textContent = calcolaTurnoVVF(now);
    }

    function calcolaTurnoVVF(date) {
        const baseDate = new Date(2026, 0, 1, 8, 0, 0); 
        const diffHours = (date - baseDate) / (1000 * 60 * 60);
        
        if (diffHours < 0) return "Turno 1 / 2";
        
        const cycleHours = 96;
        const currentCycleHour = diffHours % cycleHours;
        
        if (currentCycleHour < 12) return "Smonto / SM";
        else if (currentCycleHour < 36) return "Riposo / 24";
        else if (currentCycleHour < 48) return "Smonto / SM";
        else return "Servizio / 48";
    }

    setInterval(updateClockAndShift, 1000);
    updateClockAndShift();
});
