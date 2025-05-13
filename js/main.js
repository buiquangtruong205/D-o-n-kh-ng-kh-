const token = 'e07a68e14a7474372ace1fbbd2f622fdfbd2591c';
let mapInstance = null;
let myChart = null;
let marker = null;

function initMap() {
    const defaultLatLng = { lat: 21.0285, lng: 105.8542 };
    const mapElement = document.getElementById('map');
    if (!mapElement) {
        console.error('Element with id "map" not found.');
        return;
    }

    // Khởi tạo map
    mapInstance = L.map(mapElement).setView([defaultLatLng.lat, defaultLatLng.lng], 10);

    // Khai báo các lớp bản đồ
    const street = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: ''
    });

    const satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: ''
    });

    const dark = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: ''
    });

    const light = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: ''
    });

    // Bản đồ mặc định
    street.addTo(mapInstance);

    // Layer group để chuyển đổi
    const baseMaps = {
        "Địa chỉ (Street)": street,
        "Vệ tinh (Satellite)": satellite,
        "Tối (Dark)": dark,
        "Sáng (Light)": light
    };

    // Nút chọn lớp bản đồ
    L.control.layers(baseMaps).addTo(mapInstance);

    // Tạo marker ban đầu
    marker = L.marker([defaultLatLng.lat, defaultLatLng.lng]).addTo(mapInstance);

    mapInstance.on('click', function (e) {
        const { lat, lng } = e.latlng;
        if (marker) mapInstance.removeLayer(marker);
        marker = L.marker([lat, lng]).addTo(mapInstance);
        getAirQualityDataByCoords(lat, lng, `Vị trí: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
    });

    // Ghi chú thông tin AQI ban đầu
    infoWindow = L.popup().setLatLng([defaultLatLng.lat, defaultLatLng.lng])
        .setContent('Hà Nội')
        .openOn(mapInstance);

    // Lấy dữ liệu AQI
    getAirQualityDataByCoords(defaultLatLng.lat, defaultLatLng.lng, "Hà Nội");
}

async function searchCity() {
    const input = document.getElementById('searchInput').value.trim();
    if (!input) {
        alert('Vui lòng nhập tên địa điểm!');
        return;
    }

    try {
        const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(input)}&format=json&limit=1`);
        const geoData = await geoRes.json();
        if (!geoData.length) {
            alert('Không tìm thấy vị trí này.');
            return;
        }

        const lat = parseFloat(geoData[0].lat);
        const lon = parseFloat(geoData[0].lon);
        const name = geoData[0].display_name;

        mapInstance.setView([lat, lon], 10);
        if (marker) mapInstance.removeLayer(marker);

        marker = L.marker([lat, lon]).addTo(mapInstance);
        getAirQualityDataByCoords(lat, lon, name);
    } catch (err) {
        console.error('Lỗi truy vấn vị trí:', err);
        alert('Lỗi khi tìm kiếm địa điểm.');
    }
}

async function getAirQualityDataByCoords(lat, lon, cityName) {
    try {
        const res = await fetch(`https://api.waqi.info/feed/geo:${lat};${lon}/?token=${token}`);
        const json = await res.json();
        if (json.status === 'ok') {
            const data = json.data;
            const city = cityName || data.city.name;
            const aqi = data.aqi;
            const status = getAQIStatus(aqi);
            const advice = getAQIAdvice(aqi);
            const pollutant = data.dominentpol?.toUpperCase() || '--';
            const temp = data.iaqi.t?.v || '--';
            const humidity = data.iaqi.h?.v || '--';

            document.getElementById('city-name').innerText = city;
            document.getElementById('aqi').innerText = aqi;
            document.getElementById('status').innerText = status;
            document.getElementById('advice').innerText = advice;
            document.getElementById('main-pol').innerText = pollutant;
            document.getElementById('temp').innerText = temp;
            document.getElementById('humidity').innerText = humidity;

            // Cập nhật popup thông tin môi trường lên marker
            const popupContent = `
                <b>${city}</b><br>
                AQI: ${aqi} (${status})<br>
                Ô nhiễm chính: ${pollutant}<br>
                Nhiệt độ: ${temp}°C<br>
                Độ ẩm: ${humidity}%
            `;
            marker.bindPopup(popupContent).openPopup();

            renderForecastChart(data.forecast?.daily?.pm25 || []);
        } else {
            alert('Không tìm thấy dữ liệu chất lượng không khí cho địa điểm này!');
        }
    } catch (error) {
        console.error('Lỗi truy vấn dữ liệu:', error);
        alert('Đã có lỗi khi truy vấn dữ liệu chất lượng không khí.');
    }
}

function getAQIStatus(aqi) {
    if (aqi <= 50) return 'Tốt';
    if (aqi <= 100) return 'Trung bình';
    if (aqi <= 150) return 'Không tốt cho nhóm nhạy cảm';
    if (aqi <= 200) return 'Có hại';
    if (aqi <= 300) return 'Rất có hại';
    return 'Nguy hiểm';
}

function getAQIAdvice(aqi) {
    if (aqi <= 50) {
        return `
            Chỉ số AQI: Tốt
            Không khí trong lành. Bạn có thể sinh hoạt ngoài trời bình thường mà không gặp phải vấn đề gì. 
            Tuy nhiên, nếu bạn là người có bệnh lý về hô hấp hoặc tim mạch, hãy theo dõi tình trạng sức khỏe của mình thường xuyên.
            Khuyến nghị: Không cần thực hiện biện pháp đặc biệt, nhưng hãy tiếp tục duy trì một lối sống lành mạnh.
        `;
    }
    if (aqi <= 100) {
        return `
            Chỉ số AQI: Trung bình
            Không khí ở mức chấp nhận được cho đa số người dân. Tuy nhiên, đối với những người nhạy cảm với ô nhiễm không khí (trẻ em, người già, người có bệnh lý hô hấp), có thể gặp phải một số vấn đề nhẹ về sức khỏe.
            Khuyến nghị: Người nhạy cảm nên hạn chế các hoạt động ngoài trời cường độ cao. Nếu cảm thấy khó thở hoặc mệt mỏi, nên vào trong nhà nghỉ ngơi.
        `;
    }
    if (aqi <= 150) {
        return `
            Chỉ số AQI: Không tốt cho nhóm nhạy cảm
            Chất lượng không khí đã ảnh hưởng đến nhóm người nhạy cảm, bao gồm trẻ em, người già và những người có bệnh lý về hô hấp hoặc tim mạch. Các hoạt động ngoài trời cường độ cao nên hạn chế.
            Khuyến nghị: Người nhạy cảm (trẻ em, người già, người có bệnh lý hô hấp) nên hạn chế hoạt động ngoài trời, đặc biệt là thể dục thể thao. Đeo khẩu trang khi ra ngoài và tránh các khu vực có nhiều bụi hoặc giao thông đông đúc.
        `;
    }
    if (aqi <= 200) {
        return `
            Chỉ số AQI: Có hại cho sức khỏe
            Chất lượng không khí kém, có thể gây hại cho sức khỏe của mọi người, đặc biệt là những người có vấn đề về hô hấp, tim mạch hoặc trẻ em. Nếu không có việc cần thiết, hãy ở trong nhà và tránh tiếp xúc lâu dài với không khí bên ngoài.
            Khuyến nghị: Cố gắng tránh ra ngoài. Nếu phải ra ngoài, hãy đeo khẩu trang chất lượng cao (N95 hoặc tương đương). Đóng cửa sổ và sử dụng máy lọc không khí trong nhà để bảo vệ sức khỏe. Những người có bệnh lý về đường hô hấp hoặc tim mạch cần theo dõi tình trạng sức khỏe cẩn thận.
        `;
    }
    if (aqi <= 300) {
        return `
            Chỉ số AQI: Rất có hại
            Mức độ ô nhiễm rất cao, có thể gây tác động nghiêm trọng đến sức khỏe của mọi người, đặc biệt là những người nhạy cảm. Những người khỏe mạnh cũng có thể gặp phải vấn đề về hô hấp và tim mạch.
            Khuyến nghị: Nên ở trong nhà và hạn chế tối đa các hoạt động thể chất ngoài trời. Đảm bảo sử dụng máy lọc không khí trong nhà. Nếu cần ra ngoài, hãy đeo khẩu trang chất lượng cao và tránh các khu vực ô nhiễm nặng. Theo dõi sức khỏe cẩn thận, đặc biệt là những người có bệnh nền hoặc trẻ em.
        `;
    }
    return `
        Chỉ số AQI: Nguy hiểm
        Đây là mức độ ô nhiễm cực kỳ nguy hiểm đối với sức khỏe. Chất lượng không khí rất xấu, có thể gây tác động nặng nề đối với hô hấp và các bệnh tim mạch.<br>
        Khuyến nghị: Đóng cửa sổ và ở trong nhà hoàn toàn. Nếu phải ra ngoài, hãy đeo khẩu trang chất lượng cao (N95 hoặc tương đương) và chỉ ra ngoài khi thực sự cần thiết. Tránh các hoạt động thể chất và hạn chế tiếp xúc với không khí ngoài trời. Nếu có bất kỳ dấu hiệu khó thở hoặc mệt mỏi, hãy tìm kiếm sự hỗ trợ y tế ngay lập tức.
    `;
}


function renderForecastChart(pm25Data) {
    const ctx = document.getElementById('forecastChart').getContext('2d');
    if (myChart) myChart.destroy();
    myChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: pm25Data.map(d => d.day),
            datasets: [{
                label: 'PM2.5 (Dự báo)',
                data: pm25Data.map(d => d.avg),
                borderColor: 'rgba(75, 192, 192, 1)',
                fill: false
            }]
        },
        options: { responsive: true, scales: { y: { beginAtZero: true } } }
    });
}


window.onload = initMap;