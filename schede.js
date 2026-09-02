// schede.js
window.FireOpsSchede = {
  predefinite: {
    sinistra: 'home-comando',
    destra:   'messaggistica'
  },
  ordine: [
    { id: 'home-comando',   label: 'Home page informazioni comando' },
    { id: 'messaggistica',  label: 'Messaggistica' },
    { id: 'turnario',       label: 'Turnario' },
    { id: 'convertitore',   label: 'Convertitore coordinate' },
    // ... resto nell'ordine che vuoi tu
    { id: 'fpds',           label: 'Gestione interventi FPDS', stato: 'wip' },
    { id: 'rescuesheet',    label: 'Schede di soccorso',       stato: 'wip' },
    { id: 'radio-telefoni', label: 'Radio e telefoni',         stato: 'wip' }
  ]
};