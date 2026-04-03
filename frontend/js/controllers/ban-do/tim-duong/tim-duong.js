/**
 * FILE: js/controllers/ban-do/tim-duong/tim-duong.js
 */
let Turn_Rules = [];
let mapData = {};
let currentPath = [];
let currentSegmentIdx = 0;
let savedSpeed = 1.0;
const videoCache = {};

const videoEl = document.getElementById('guideVideo');
const videoSection = document.getElementById('videoSection');
const videoError = document.getElementById('videoError');
const videoMapArea = document.querySelector('.video-map-area');
const startSel = document.getElementById('start');
const endSel = document.getElementById('end');
const instructionBox = document.getElementById('instructionText');

let lastTurnSoundSegment = -1;
let lastTurnSound = "";

function playTurnAudio(turnText, skipCheck = false) {
    if (!turnText) return null;
    let text = turnText.toLowerCase().trim();
    if (!skipCheck && text === lastTurnSound) return null;

    lastTurnSound = text;
    let file = "";
    if (text.includes("rẽ trái")) file = "../../assets/media/pages/ban-do/tim-duong/re-trai.mp3";
    else if (text.includes("rẽ phải")) file = "../../assets/media/pages/ban-do/tim-duong/re-phai.mp3";
    else if (text.includes("đi thẳng")) file = "../../assets/media/pages/ban-do/tim-duong/di-thang.mp3";

    if (!file) return null;
    const audio = new Audio(file);
    audio.play().catch(err => console.warn("Không thể phát âm thanh:", err));
    return audio;
}

function playArrivalAudio(placeName) {
    const fileName = `../../assets/media/pages/ban-do/tim-duong/đã đến ${placeName}.mp3`;
    const audio = new Audio(fileName);
    audio.play().catch(() => { });
    return audio;
}

function setInstruction(text) {
    if (instructionBox) {
        instructionBox.innerText = text;
        instructionBox.style.display = 'block';
    }
}

function setSpeed(speed) {
    const value = Number(speed);
    if (Number.isNaN(value) || value <= 0) return;

    savedSpeed = value;
    if (videoEl) {
        videoEl.playbackRate = savedSpeed;
    }

    document.querySelectorAll('.speed-controls button').forEach(button => {
        const buttonSpeed = Number(button.textContent.replace('x', '').trim());
        button.classList.toggle('active-speed', buttonSpeed === savedSpeed);
    });
}

function getNextTurnInstruction(idx) {
    if (idx + 2 >= currentPath.length) return "Đến nơi";
    const prev = String(currentPath[idx]).trim();
    const curr = String(currentPath[idx + 1]).trim();
    const next = String(currentPath[idx + 2]).trim();

    const rule = Turn_Rules.find(r =>
        String(r.from_node ?? r.from).trim() === prev &&
        String(r.via_node ?? r.via).trim() === curr &&
        String(r.to_node ?? r.to).trim() === next
    );
    return rule ? (rule.turn_direction ?? rule.turn) : "Đi thẳng";
}

function calculatePathDistance(path, nodes) {
    let totalDist = 0;
    for (let i = 0; i < path.length - 1; i++) {
        const n1 = nodes[path[i]];
        const n2 = nodes[path[i + 1]];
        if (n1 && n2) {
            const x1 = parseFloat(n1.pos_x ?? n1.x ?? n1.X ?? 0);
            const y1 = parseFloat(n1.pos_y ?? n1.y ?? n1.Y ?? 0);
            const x2 = parseFloat(n2.pos_x ?? n2.x ?? n2.X ?? 0);
            const y2 = parseFloat(n2.pos_y ?? n2.y ?? n2.Y ?? 0);
            totalDist += Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2);
        }
    }
    return totalDist;
}

// ==========================================
// HÀM RESET CAMERA BẢN ĐỒ VỀ TRẠNG THÁI GỐC
// ==========================================
function resetMapZoom() {
    const canvas = document.getElementById('mapCanvas');
    const svgMap = document.getElementById('map-svg');
    if (canvas && svgMap) {
        svgMap.style.width = '100%';
        svgMap.style.height = '100%';
        svgMap.style.transform = 'translate(0px, 0px) scale(1)';
        svgMap.style.transformOrigin = 'center center';
        svgMap.style.transition = 'transform 0.4s ease';
        
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.transform = 'translate(0px, 0px) scale(1)';
        canvas.style.transformOrigin = 'center center';
        canvas.style.transition = 'transform 0.4s ease';
    }
}

window.onload = async () => {
    mapData = await fetchMapData();
    window.mapData = mapData;
    window.currentPath = [];
    if (!mapData) return alert("Lỗi tải dữ liệu!");

    if (Array.isArray(mapData.nodes)) {
        mapData.nodes = mapData.nodes.reduce((acc, node) => {
            const key = node.id ?? node.ID ?? node.node_id ?? node.location_code ?? node.name;
            if (key != null) acc[String(key)] = node;
            return acc;
        }, {});
    }

    if (Array.isArray(mapData.edges)) {
        mapData.connections = mapData.edges
            .map(edge => [
                edge.from_node ?? edge.from_node_id ?? edge.from ?? edge.u ?? edge.p1,
                edge.to_node ?? edge.to_node_id ?? edge.to ?? edge.v ?? edge.p2,
                Number(edge.type ?? edge.edge_type ?? edge.direction ?? 0)
            ])
            .filter(pair => pair[0] != null && pair[1] != null);
    }

    if (Array.isArray(mapData.turnRules)) {
        mapData.TurnRules = mapData.turnRules;
    }

    if (Array.isArray(mapData.locations)) {
        mapData.Locations = mapData.locations.reduce((acc, loc) => {
            const key = loc.location_code ?? loc.id ?? loc.ID ?? loc.location_id ?? loc.code;
            if (key != null) acc[String(key)] = loc;
            return acc;
        }, {});
    }

    Turn_Rules = mapData.TurnRules || mapData.turnRules || [];

    // TÍNH TOÁN BIÊN ĐỘ BẢN ĐỒ ĐỂ TRACKING CAMERA
    let foundMaxX = 0, foundMaxY = 0;
    Object.values(mapData.nodes).forEach(n => {
        const x = parseFloat(n.pos_x ?? n.x ?? n.X ?? 0);
        const y = parseFloat(n.pos_y ?? n.y ?? n.Y ?? 0);
        if (x > foundMaxX) foundMaxX = x;
        if (y > foundMaxY) foundMaxY = y;
    });
    window.mapBounds = { 
        x: foundMaxX > 0 ? foundMaxX : 100, 
        y: foundMaxY > 0 ? foundMaxY : 100 
    };

    const uniqueLocations = {};
    const detailedLocations = [];

    Object.keys(mapData.nodes).forEach(id => {
        const node = mapData.nodes[id];
        const nodeType = (node.node_type ?? node.type ?? '').toLowerCase();
        if (nodeType === "red") {
            const name = node.name || id;
            if (!uniqueLocations[name]) uniqueLocations[name] = [];
            uniqueLocations[name].push(id);
        }
    });

    if (mapData.Locations) {
        for (const key in mapData.Locations) {
            const loc = mapData.Locations[key];
            if (String(loc.type).trim() !== "1") continue; 

            let buildingIds = (loc.building && uniqueLocations[loc.building])
                ? uniqueLocations[loc.building].join(',')
                : key.split('_')[0];

            let displayName = loc.specific_location ?? loc.name ?? loc.description ?? key;
            if (loc.floor && loc.floor !== "none") displayName += ` - ${loc.floor}`;

            detailedLocations.push({ name: displayName, id: key, target: buildingIds, building: loc.building });
        }
    }

    startSel.innerHTML = '<option value="">Chọn điểm xuất phát</option>';
    endSel.innerHTML = '<option value="">Chọn điểm đến</option>';

    Object.keys(uniqueLocations).forEach(name => {
        const ids = uniqueLocations[name].join(',');
        const opt1 = new Option(name, ids); opt1.setAttribute('data-target', ids);
        const opt2 = new Option(name, ids); opt2.setAttribute('data-target', ids);
        startSel.add(opt1); endSel.add(opt2);
    });

    detailedLocations.forEach(loc => {
        const opt1 = new Option(loc.name, loc.id); opt1.setAttribute('data-target', loc.target);
        const opt2 = new Option(loc.name, loc.id); opt2.setAttribute('data-target', loc.target);
        startSel.add(opt1); endSel.add(opt2);
    });

    function buildCustomDropdown(selectEl, placeholderText) {
        selectEl.style.display = 'none';

        const container = document.createElement('div');
        container.className = 'custom-dropdown';

        const header = document.createElement('div');
        header.className = 'dropdown-header';
        header.innerText = placeholderText;

        header.onclick = (e) => {
            e.stopPropagation();
            const isOpen = list.style.display === 'block';
            document.querySelectorAll('.dropdown-list').forEach(l => l.style.display = 'none');
            list.style.display = isOpen ? 'none' : 'block';
        };

        const list = document.createElement('ul');
        list.className = 'dropdown-list';
        list.style.display = 'none';

        Object.keys(uniqueLocations).forEach(buildingName => {
            const ids = uniqueLocations[buildingName].join(',');
            const roomsInBuilding = detailedLocations.filter(loc => loc.building === buildingName);

            const li = document.createElement('li');
            const row = document.createElement('div');
            row.className = 'dropdown-row';

            const nameSpan = document.createElement('span');
            nameSpan.className = 'item-name';
            nameSpan.innerHTML = `<i class="fas fa-building" style="color:#f39c12; margin-right:8px;"></i>${buildingName}`;
            nameSpan.onclick = () => {
                selectEl.value = ids;
                header.innerHTML = `<i class="fas fa-map-marker-alt" style="color:#e74c3c; margin-right:8px;"></i>${buildingName}`;
                list.style.display = 'none';
            };
            row.appendChild(nameSpan);

            if (roomsInBuilding.length > 0) {
                const arrow = document.createElement('span');
                arrow.className = 'toggle-arrow';
                arrow.innerText = '▼';

                const subList = document.createElement('ul');
                subList.className = 'sub-list';
                subList.style.display = 'none';

                roomsInBuilding.forEach(room => {
                    const subLi = document.createElement('li');
                    subLi.innerText = `↳ ${room.name}`;
                    subLi.onclick = (e) => {
                        e.stopPropagation();
                        selectEl.value = room.id;
                        header.innerHTML = `<i class="fas fa-map-marker-alt" style="color:#e74c3c; margin-right:8px;"></i>${room.name}`;
                        list.style.display = 'none';
                    };
                    subList.appendChild(subLi);
                });

                arrow.onclick = (e) => {
                    e.stopPropagation();
                    const isSubOpen = subList.style.display === 'block';
                    subList.style.display = isSubOpen ? 'none' : 'block';
                    arrow.innerText = isSubOpen ? '▼' : '▲';
                };

                row.appendChild(arrow);
                li.appendChild(row);
                li.appendChild(subList);
            } else {
                li.appendChild(row);
            }
            list.appendChild(li);
        });

        document.addEventListener('click', (e) => {
            if (!container.contains(e.target)) list.style.display = 'none';
        });

        container.appendChild(header);
        container.appendChild(list);
        selectEl.parentNode.insertBefore(container, selectEl.nextSibling);

        selectEl.updateCustomHeader = function (name) {
            header.innerHTML = `<i class="fas fa-map-marker-alt" style="color:#e74c3c; margin-right:8px;"></i>${name}`;
        };
    }

    buildCustomDropdown(startSel, "Chọn điểm xuất phát");
    buildCustomDropdown(endSel, "Chọn điểm đến");

    if (typeof initCanvas === 'function') initCanvas('mapCanvas');
    setSpeed(savedSpeed);

    videoEl.onloadeddata = () => {
        videoEl.playbackRate = savedSpeed;
        videoEl.play().catch(() => { });
        setInstruction("Đi thẳng");
        playTurnAudio("Đi thẳng");
    };

    videoEl.onended = () => {
        if (videoCache[currentSegmentIdx]) {
            URL.revokeObjectURL(videoCache[currentSegmentIdx]);
            delete videoCache[currentSegmentIdx];
        }
        if (currentSegmentIdx < currentPath.length - 2) {
            const turnText = getNextTurnInstruction(currentSegmentIdx);
            setInstruction(turnText);
            const audio = playTurnAudio(turnText);
            if (audio) audio.onended = () => { currentSegmentIdx++; playSegment(currentSegmentIdx); };
            else setTimeout(() => { currentSegmentIdx++; playSegment(currentSegmentIdx); }, 500);
        } else {
            const destId = currentPath[currentPath.length - 1];
            const destName = mapData.nodes[destId]?.name || destId;
            setInstruction(`Đã đến ${destName}`);

            // NHẢ ZOOM CAMERA VỀ MẶC ĐỊNH
            resetMapZoom();

            // ==========================================
            // THÊM 2 DÒNG NÀY ĐỂ TRẢ BẢN ĐỒ VỀ VỊ TRÍ CŨ
            // ==========================================
            videoSection.style.display = 'none';
            if (videoMapArea) videoMapArea.classList.remove('video-playing');

            const arrivalAudio = playArrivalAudio(destName);
            if (arrivalAudio) {
                arrivalAudio.onended = () => {
                    const introAudio = new Audio(`../../assets/media/pages/ban-do/tim-duong/${destId}.mp3`);
                    introAudio.play().catch(e => console.log("Chưa có file audio giới thiệu:", e));
                };
            }

            lastTurnSound = "";
            setTimeout(() => {
                const modal = document.getElementById('image-modal');
                const iframe = document.getElementById('modal-iframe');
                if (modal && iframe) {
                    iframe.src = 'about:blank';
                    setTimeout(() => {
                        iframe.src = `chi-tiet-tim-duong.html?id=${destId}&t=${Date.now()}`;
                        modal.style.display = 'flex';
                    }, 100);
                }
            }, 600);
        }
    };

    videoEl.ontimeupdate = () => {
        if (videoEl.duration) {
            const percent = videoEl.currentTime / videoEl.duration;
            if (typeof drawMapState === 'function') {
                drawMapState(currentPath, currentPath[currentSegmentIdx], currentPath[currentSegmentIdx + 1], mapData.nodes, percent);
            }

            // ==========================================
            // LOGIC CAMERA ZOOM VÀ TRACKING THEO CON TRỎ
            // ==========================================
            const mapArea = document.querySelector('.video-map-area');
            const canvas = document.getElementById('mapCanvas');
            const svgMap = document.getElementById('map-svg');
            
            if (mapArea && mapArea.classList.contains('video-playing') && canvas && svgMap) {
                const u = currentPath[currentSegmentIdx];
                const v = currentPath[currentSegmentIdx + 1];
                const n1 = mapData.nodes[u];
                const n2 = mapData.nodes[v];

                if (n1 && n2 && window.mapBounds && window.mapBaseWidth) {
                    const x1 = parseFloat(n1.pos_x ?? n1.x ?? n1.X ?? 0);
                    const y1 = parseFloat(n1.pos_y ?? n1.y ?? n1.Y ?? 0);
                    const x2 = parseFloat(n2.pos_x ?? n2.x ?? n2.X ?? 0);
                    const y2 = parseFloat(n2.pos_y ?? n2.y ?? n2.Y ?? 0);

                    const currentX = x1 + (x2 - x1) * percent;
                    const currentY = y1 + (y2 - y1) * percent;

                    const originX = (currentX / window.mapBounds.x);
                    const originY = (currentY / window.mapBounds.y);

                    // Tọa độ Pixel thực tế trên bản đồ
                    const pointX = originX * window.mapBaseWidth;
                    const pointY = originY * window.mapBaseHeight;

                    const S = 0.75; // Độ zoom (thay đổi to/nhỏ tùy ý)
                    const mapCont = document.getElementById('map-container');
                    const cw = mapCont ? mapCont.clientWidth : 200; 
                    const ch = mapCont ? mapCont.clientHeight : 200;

                    // Tính độ dịch chuyển để đưa chấm đỏ vào giữa khung hình
                    let transX = (cw / 2) - (pointX * S);
                    let transY = (ch / 2) - (pointY * S);

                    const scaledWidth = window.mapBaseWidth * S;
                    const scaledHeight = window.mapBaseHeight * S;

                    // KHÓA CAMERA: Không cho dịch chuyển quá đà làm hở mảng trắng
                    if (scaledWidth > cw) {
                        if (transX > 0) transX = 0;
                        if (transX < cw - scaledWidth) transX = cw - scaledWidth;
                    } else {
                        transX = (cw - scaledWidth) / 2;
                    }
                    
                    if (scaledHeight > ch) {
                        if (transY > 0) transY = 0;
                        if (transY < ch - scaledHeight) transY = ch - scaledHeight;
                    } else {
                        transY = (ch - scaledHeight) / 2;
                    }

                    // Áp dụng dịch chuyển và phóng to cho cả SVG lẫn Canvas
                    const transformStyle = `translate(${transX}px, ${transY}px) scale(${S})`;
                    const originStyle = `0 0`; // Lấy tâm từ góc trên cùng bên trái
                    
                    svgMap.style.transformOrigin = originStyle;
                    svgMap.style.transform = transformStyle; 
                    svgMap.style.transition = 'none'; // Bỏ transition để camera di chuyển không bị lag theo video

                    canvas.style.transformOrigin = originStyle;
                    canvas.style.transform = transformStyle; 
                    canvas.style.transition = 'none';
                }
            }
        }
    };

    videoEl.onerror = () => {
        videoError.style.display = 'block';
        videoError.innerText = `Đang chuyển tiếp...`;
        setTimeout(() => { videoEl.onended(); }, 500);
    };

    document.getElementById('btnFind').onclick = () => {
        const sOption = startSel.options[startSel.selectedIndex];
        const eOption = endSel.options[endSel.selectedIndex];

        if (!sOption || !eOption || !sOption.value || !eOption.value) return alert("Vui lòng chọn điểm đi và đến!");

        const sValue = sOption.getAttribute('data-target') || sOption.value;
        const eValue = eOption.getAttribute('data-target') || eOption.value;

        if (sValue && eValue) {
            if (sValue === eValue) return alert("Trùng điểm!");
            const startIds = sValue.split(',');
            const endIds = eValue.split(',');

            let shortestPath = [];
            let minDist = Infinity;

            startIds.forEach(s => {
                endIds.forEach(e => {
                    if (typeof findShortestPath === 'function') {
                        const path = findShortestPath(s, e, mapData.nodes, mapData.connections);
                        if (path.length > 0) {
                            const dist = calculatePathDistance(path, mapData.nodes);
                            if (dist < minDist) { minDist = dist; shortestPath = path; }
                        }
                    }
                });
            });

            currentPath = shortestPath;
            const btnStart = document.getElementById('btnStartJourney');

            if (currentPath.length === 0) {
                alert("Không có đường đi!");
                videoSection.style.display = 'none';
                if (videoMapArea) videoMapArea.classList.remove('video-playing');
                resetMapZoom(); // Nhả zoom
                if (btnStart) btnStart.style.display = 'none';
                return;
            }

            if (typeof drawMapState === 'function') {
                drawMapState(currentPath, currentPath[currentSegmentIdx], currentPath[currentSegmentIdx + 1], mapData.nodes, 0);
            }

            // Ẩn video, trả map về lớn
            videoSection.style.display = 'none';
            if (videoMapArea) videoMapArea.classList.remove('video-playing');
            videoEl.pause();

            // Nhả zoom trả lại bình thường
            resetMapZoom();

            if (btnStart) btnStart.style.display = 'inline-block';
        }
    };

    const btnStartJourney = document.getElementById('btnStartJourney');
    if (btnStartJourney) {
        btnStartJourney.onclick = () => {
            btnStartJourney.style.display = 'none';
            videoSection.style.display = 'block';
            videoEl.style.display = 'block';
            videoError.style.display = 'none';
            
            // --- CỐ ĐỊNH KÍCH THƯỚC BẢN ĐỒ GỐC TRƯỚC KHI THU NHỎ ---
            const container = document.getElementById('map-container');
            const svgMap = document.getElementById('map-svg');
            const canvas = document.getElementById('mapCanvas');
            
            if (container && svgMap && canvas) {
                window.mapBaseWidth = container.clientWidth || 800;
                window.mapBaseHeight = container.clientHeight || 520;
                
                // Ép kích thước bản đồ giữ nguyên để không bị thu nhỏ mảng trắng
                svgMap.style.width = window.mapBaseWidth + 'px';
                svgMap.style.height = window.mapBaseHeight + 'px';
                canvas.style.width = window.mapBaseWidth + 'px';
                canvas.style.height = window.mapBaseHeight + 'px';
            }

            if (videoMapArea) videoMapArea.classList.add('video-playing');

            for (let k in videoCache) { URL.revokeObjectURL(videoCache[k]); delete videoCache[k]; }
            currentSegmentIdx = 0;
            lastTurnSound = "";
            playSegment(0);
        };
    }

}; // <-- End window.onload

async function playSegment(index) {
    if (index >= currentPath.length - 1) return;
    const u = currentPath[index]; const v = currentPath[index + 1];
    videoError.style.display = 'none';
    if (typeof drawMapState === 'function') drawMapState(currentPath, u, v, mapData.nodes, 0);

    if (videoCache[index]) videoEl.src = videoCache[index];
    else videoEl.src = `../../assets/media/pages/ban-do/tim-duong/${u}_${v}.mp4`;
    preloadNextBlob(index + 1);
}

async function preloadNextBlob(nextIndex) {
    if (nextIndex >= currentPath.length - 1 || videoCache[nextIndex]) return;
    const u = currentPath[nextIndex]; const v = currentPath[nextIndex + 1];
    try {
        const res = await fetch(`../../assets/media/pages/ban-do/tim-duong/${u}_${v}.mp4`);
        videoCache[nextIndex] = URL.createObjectURL(await res.blob());
    } catch (err) { }
}

/* ========================================================
   LOGIC THANH TÌM KIẾM ĐỒNG BỘ GIAO DIỆN
======================================================== */
const searchInput = document.getElementById('searchInput');
const searchResults = document.getElementById('searchResults');

function ensureSelectOption(selectBox, value, name) {
    let option = Array.from(selectBox.options).find(opt => opt.value === value);
    if (!option) {
        option = new Option(name, value);
        option.dataset.target = value;
        selectBox.add(option);
    }
    selectBox.value = value;
    return option;
}

function getLocationsFromSelect() {
    const options = document.querySelectorAll('#start option');
    const locations = [];
    options.forEach(opt => {
        if (opt.value) locations.push({ id: opt.value, name: opt.innerText, target: opt.dataset.target || opt.getAttribute('data-target') });
    });
    return locations;
}

searchInput.addEventListener('input', function () {
    const keyword = this.value.toLowerCase().trim();
    searchResults.innerHTML = '';
    if (keyword.length === 0) { searchResults.style.display = 'none'; return; }

    const filtered = getLocationsFromSelect().filter(loc => loc.name.toLowerCase().includes(keyword));
    const grouped = {};
    filtered.forEach(loc => {
        const key = loc.name.toLowerCase().trim();
        if (!grouped[key]) {
            grouped[key] = { name: loc.name, ids: new Set(), targets: new Set() };
        }
        const idValues = (loc.target || loc.id || '').split(',').map(v => v.trim()).filter(Boolean);
        idValues.forEach(value => grouped[key].ids.add(value));
        if (loc.target) grouped[key].targets.add(loc.target);
    });
    const deduped = Object.values(grouped).map(item => ({
        id: Array.from(item.ids).join(','),
        name: item.name,
        target: Array.from(item.ids).join(',')
    }));

if (deduped.length > 0) {
        deduped.forEach(loc => {
            const li = document.createElement('li');
            li.innerHTML = `
                <div style="flex-grow: 1; color: #444; font-weight: 500;">
                    <i class="fas fa-map-marker-alt" style="color: #f39c12; margin-right: 12px;"></i>${loc.name}
                </div>
                <div class="search-actions">
                    <button class="btn-set-start" onclick="setSearchAs('start', '${loc.target}', '${loc.name}', event)">Xuất phát</button>
                    <button class="btn-set-end" onclick="setSearchAs('end', '${loc.target}', '${loc.name}', event)">Điểm đến</button>
                </div>
            `;
            li.onclick = (e) => setSearchAs('end', loc.target, loc.name, e);
            searchResults.appendChild(li);
        });
        searchResults.style.display = 'block';
    } else {
        searchResults.innerHTML = '<li style="color: #999; justify-content: center;">Không tìm thấy địa điểm nào phù hợp</li>';
        searchResults.style.display = 'block';
    }
});

window.setSearchAs = function (type, id, name, event) {
    event.stopPropagation();
    const selectBox = document.getElementById(type);
    if (selectBox) {
        ensureSelectOption(selectBox, id, name);
        if (typeof selectBox.updateCustomHeader === 'function') {
            selectBox.updateCustomHeader(name);
        }
    }
    searchInput.value = '';
    searchInput.placeholder = `Đã chọn ${type === 'start' ? 'Xuất phát' : 'Điểm đến'}: ${name}`;
    searchResults.style.display = 'none';
};

document.addEventListener('click', function (e) {
    if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
        searchResults.style.display = 'none';
    }
});

/* ========================================================
   TÍNH NĂNG THAM QUAN BẰNG VIDEO
======================================================== */
const tourData = {
    "toa-nha-d1": { title: "Tòa nhà D1", desc: "Giảng đường chất lượng cao...", video: "../../assets/media/pages/ban-do/tham-quan/d1-tour.mp4" },
    "default": { title: "Đang cập nhật video...", desc: "Sẽ sớm bổ sung...", video: "../../assets/media/pages/ban-do/tham-quan/default-tour.mp4" }
};
window.showTourPrompt = function (destId, destName) {
    const prompt = document.getElementById('tourPrompt');
    if (prompt) {
        document.getElementById('tourPromptName').innerText = destName;
        prompt.style.display = 'block';
        document.getElementById('btnYesTour').onclick = () => { closeTourPrompt(); openTourModule(destId, destName); };
    }
};
window.closeTourPrompt = () => { const p = document.getElementById('tourPrompt'); if (p) p.style.display = 'none'; };
window.openTourModule = (destId, destName) => {
    const modal = document.getElementById('tourModuleModal');
    const data = tourData[destId] || { ...tourData['default'], title: destName };
    document.getElementById('tourTitle').innerText = data.title; document.getElementById('tourDesc').innerText = data.desc;
    const videoEl = document.getElementById('tourVideo'); videoEl.src = data.video;
    if (modal) { modal.style.display = 'flex'; videoEl.load(); videoEl.play().catch(e => console.log(e)); }
};
window.closeTourModule = () => {
    const modal = document.getElementById('tourModuleModal');
    if (modal) { modal.style.display = 'none'; const v = document.getElementById('tourVideo'); v.pause(); v.currentTime = 0; }
};
/* ========================================================
   LOGIC NÚT TẠM DỪNG / TIẾP TỤC VIDEO
======================================================== */
const btnPausePlay = document.getElementById('btnPausePlay');

if (btnPausePlay && videoEl) {
    btnPausePlay.addEventListener('click', function () {
        if (!videoEl.src || videoEl.src === window.location.href) {
            return;
        }

        if (videoEl.paused) {
            videoEl.play();
            btnPausePlay.innerHTML = '<i class="fas fa-pause"></i> Tạm dừng';
            btnPausePlay.style.background = '#003478'; 
        } else {
            videoEl.pause();
            btnPausePlay.innerHTML = '<i class="fas fa-play"></i> Tiếp tục';
            btnPausePlay.style.background = '#e74c3c'; 
        }
    });
}
/* ========================================================
   LOGIC NÚT QUAY LẠI ĐIỂM TRƯỚC
======================================================== */
const btnPrevNode = document.getElementById('btnPrevNode');

if (btnPrevNode && videoEl) {
    btnPrevNode.addEventListener('click', function () {
        if (!videoEl.src || videoEl.src === window.location.href) {
            return;
        }

        if (videoEl.currentTime > 1.5) {
            videoEl.currentTime = 0;
            videoEl.pause();
            if (btnPausePlay) {
                btnPausePlay.innerHTML = '<i class="fas fa-play"></i> Tiếp tục';
                btnPausePlay.style.background = '#e74c3c'; 
            }
        }
        else {
            if (currentSegmentIdx > 0) {
                currentSegmentIdx--; 
                lastTurnSound = "";
                playSegment(currentSegmentIdx);
                setTimeout(function () {
                    videoEl.pause();
                    if (btnPausePlay) {
                        btnPausePlay.innerHTML = '<i class="fas fa-play"></i> Tiếp tục';
                        btnPausePlay.style.background = '#e74c3c';
                    }
                }, 150);
            } else {
                videoEl.currentTime = 0;
                videoEl.pause();
                if (btnPausePlay) {
                    btnPausePlay.innerHTML = '<i class="fas fa-play"></i> Tiếp tục';
                    btnPausePlay.style.background = '#e74c3c';
                }
            }
        }
    });
}

// =========================================
// POPUP HƯỚNG DẪN SỬ DỤNG
// =========================================
document.addEventListener('DOMContentLoaded', () => {
    const popup = document.getElementById('guide-popup');
    const closeBtn = document.querySelector('.popup-close');

    if (popup && closeBtn) {
        popup.style.display = 'flex';
        closeBtn.addEventListener('click', () => {
            popup.style.display = 'none';
        });
        popup.addEventListener('click', (e) => {
            if (e.target === popup) {
                popup.style.display = 'none';
            }
        });
    }
});