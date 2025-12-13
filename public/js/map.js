const map = L.map('map').setView([Number(lat), Number(lon)], 13);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
}).addTo(map);

L.marker([Number(lat), Number(lon)]).addTo(map)
    .bindPopup(`<h4> ${title}</h4> <p> Exact location will be provided after booking</p>`)
    .openPopup();





