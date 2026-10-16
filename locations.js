// Makkee US locations: the single source of truth for the Locations page and the home page map.
// To add a shop, add an entry here. lon/lat only place the pin; the Directions link uses the address.
// Open shops show address, hours, phone, Directions, and DoorDash; leave phone or doordash out if the shop has none. Coming-soon shops need only id, name, area, state, lon/lat.
const MAKKEE_LOCATIONS = [
	{ id: 'rowland-heights', name: 'Rowland Heights', area: 'Los Angeles area', state: 'CA', street: '1390 Fullerton Rd, Ste 104', cityLine: 'Rowland Heights, CA 91748', lon: -117.8889, lat: 33.9786,
		hours: ['Sun–Thu · 11:30 AM–11 PM', 'Fri–Sat · 11:30 AM–12 AM'], phone: '(626) 269-0803', doordash: 'https://www.doordash.com/store/makkee-dessert-%E9%BA%A6%E8%AE%B0%E7%89%9B%E5%A5%B6%E5%85%AC%E5%8F%B8-39584031/' },
	{ id: 'san-gabriel', name: 'San Gabriel', area: 'Los Angeles area', state: 'CA', street: '301 W Valley Blvd', cityLine: 'San Gabriel, CA 91776', lon: -118.108, lat: 34.0783,
		hours: ['Sun–Thu · 12 PM–11 PM', 'Fri–Sat · 12 PM–12 AM'], phone: '(626) 427-1015', doordash: 'https://www.doordash.com/store/makkee-dessert-%E9%BA%A6%E8%AE%B0%E7%89%9B%E5%A5%B6%E5%85%AC%E5%8F%B8-san-gabriel-51439276/119108949/' },
	{ id: 'koreatown', name: 'Koreatown', area: 'Los Angeles', state: 'CA', street: '3450 W 6th St, Ste 108', cityLine: 'Los Angeles, CA 90020', lon: -118.2968, lat: 34.0636,
		hours: ['Sun–Thu · 1:30 PM–11:30 PM', 'Fri–Sat · 1 PM–12:30 AM'], phone: '(213) 568-3040', doordash: 'https://www.doordash.com/store/makkee-dessert-ktown-%E9%BA%A6%E8%AE%B0%E7%89%9B%E5%A5%B6%E5%85%AC%E5%8F%B8-los-angeles-50744555/' },
	{ id: 'mountain-view', name: 'Mountain View', area: 'Bay Area', state: 'CA', street: '134 Castro St', cityLine: 'Mountain View, CA 94041', lon: -122.0786, lat: 37.3945,
		hours: ['Sun–Fri · 12 PM–10 PM', 'Sat · 12 PM–9 PM'], doordash: 'https://www.doordash.com/store/makkee-dessert-%E9%BA%A6%E8%AE%B0%E7%89%9B%E5%A5%B6%E5%85%AC%E5%8F%B8-mountain-view-49854485/' },
	{ id: 'san-jose', name: 'San Jose', area: 'Bay Area', state: 'CA', lon: -121.8863, lat: 37.3382, comingSoon: true },
	{ id: 'flushing', name: 'Flushing', area: 'Queens', state: 'NY', street: '133-36 37th Ave, Unit F11', cityLine: 'Flushing, NY 11354', lon: -73.8346, lat: 40.7601,
		hours: ['Mon–Thu · 12 PM–9:30 PM', 'Fri–Sat · 12 PM–10:30 PM', 'Sun · 12 PM–10 PM'], phone: '(929) 468-8682', doordash: 'https://www.doordash.com/store/makkee-dessert--flushing-50409181/' },
	{ id: 'brooklyn', name: 'Brooklyn', area: 'New York City', state: 'NY', lon: -73.9442, lat: 40.6782, comingSoon: true },
	{ id: 'bellevue', name: 'Downtown Bellevue', area: 'Seattle area', state: 'WA', street: '10797 Main St', cityLine: 'Bellevue, WA 98004', lon: -122.1974, lat: 47.6104,
		hours: ['Every day · 12 PM–9 PM'], phone: '(425) 223-5148', doordash: 'https://www.doordash.com/store/makkee-dessert-seattle-%E9%BA%A6%E8%AE%B0%E7%89%9B%E5%A5%B6%E5%85%AC%E5%8F%B8-bellevue-52306765/121913362/' }
];

const MAKKEE_STATES = { CA: 'California', NY: 'New York', WA: 'Washington' };

const W = 975, H = 610, MAX_ZOOM = 40;
// Matches the projection us-atlas used to pre-project states-albers-10m.json.
const projection = d3.geoAlbersUsa().scale(1300).translate([W / 2, H / 2]);

function fullAddress(loc) { return `${loc.street}, ${loc.cityLine}`; }
function directionsUrl(loc) { return 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(fullAddress(loc)); }

function milesBetween(a, b) {
	const rad = Math.PI / 180, R = 3958.8;
	const dLat = (b.lat - a.lat) * rad, dLon = (b.lon - a.lon) * rad;
	const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
	return 2 * R * Math.asin(Math.sqrt(h));
}

// Draws the interactive US map into `root` (.loc-map). `onSelect(id)` fires when a pin is clicked.
function createMakkeeMap(root, { onSelect } = {}) {
	const topo = window.US_STATES_TOPO;
	const states = topojson.feature(topo, topo.objects.states).features;
	const path = d3.geoPath();
	const shopStates = new Set(MAKKEE_LOCATIONS.map(l => MAKKEE_STATES[l.state]));
	const points = MAKKEE_LOCATIONS.map(l => ({ ...l, xy: projection([l.lon, l.lat]) }));

	const svg = d3.select(root).append('svg').attr('class', 'loc-map-svg').attr('viewBox', [0, 0, W, H]).attr('role', 'img').attr('aria-label', 'Map of Makkee Dessert locations in the United States');
	svg.append('rect').attr('class', 'loc-map-sea').attr('width', W).attr('height', H).on('click', () => reset());
	const land = svg.append('g');
	land.selectAll('path').data(states).join('path')
		.attr('class', d => 'loc-state' + (shopStates.has(d.properties.name) ? ' loc-state-active' : ''))
		.attr('d', path)
		.on('click', (event, d) => { event.stopPropagation(); zoomToBounds(path.bounds(d)); })
		.append('title').text(d => d.properties.name);
	land.append('path').attr('class', 'loc-borders').attr('d', path(topojson.mesh(topo, topo.objects.states, (a, b) => a !== b)));
	const youLayer = svg.append('g').attr('class', 'loc-you-layer');
	const pinLayer = svg.append('g').attr('class', 'loc-pins');
	const tip = d3.select(root).append('div').attr('class', 'loc-tip').attr('aria-hidden', 'true');

	let transform = d3.zoomIdentity, selectedId = null, you = null, clusters = [];
	// Pins stay a constant on-screen size, so convert px to viewBox units.
	const unit = () => W / (root.clientWidth || W);

	const zoom = d3.zoom().scaleExtent([1, MAX_ZOOM]).translateExtent([[0, 0], [W, H]])
		.filter(event => {
			if (event.button) return false;
			if (event.type === 'wheel') return event.ctrlKey || event.metaKey || root.classList.contains('is-engaged');
			// On touch screens one finger scrolls the page until the map is zoomed in; pinch always zooms.
			if (event.type === 'touchstart') return event.touches.length > 1 || transform.k > 1;
			return true;
		})
		.on('zoom', event => { transform = event.transform; land.attr('transform', transform); draw(); });
	svg.call(zoom).on('dblclick.zoom', null).style('touch-action', null);
	// Let the page scroll past the map until someone clicks into it.
	root.addEventListener('pointerdown', () => root.classList.add('is-engaged'));
	root.addEventListener('mouseleave', () => root.classList.remove('is-engaged'));

	function cluster() {
		const r = 22 * unit(), out = [], used = new Set();
		const placed = points.map(p => ({ p, s: transform.apply(p.xy) }));
		for (const a of placed) {
			if (used.has(a.p.id)) continue;
			const members = placed.filter(b => !used.has(b.p.id) && Math.hypot(a.s[0] - b.s[0], a.s[1] - b.s[1]) < r);
			members.forEach(m => used.add(m.p.id));
			out.push({ key: members.map(m => m.p.id).sort().join('|'), members: members.map(m => m.p), x: d3.mean(members, m => m.s[0]), y: d3.mean(members, m => m.s[1]) });
		}
		return out;
	}

	function draw() {
		const u = unit();
		clusters = cluster();
		const g = pinLayer.selectAll('g.loc-pin').data(clusters, d => d.key).join(enter => {
			const e = enter.append('g').attr('class', 'loc-pin').attr('tabindex', 0).attr('role', 'button');
			e.append('circle').attr('class', 'loc-pin-halo');
			e.append('circle').attr('class', 'loc-pin-dot');
			e.append('text').attr('class', 'loc-pin-count').attr('text-anchor', 'middle').attr('dominant-baseline', 'central');
			e.on('click', (event, d) => { event.stopPropagation(); activate(d); })
				.on('keydown', (event, d) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); activate(d); } })
				.on('mouseenter focus', (event, d) => showTip(d))
				.on('mouseleave blur', () => showTip(null));
			return e;
		});
		g.attr('transform', d => `translate(${d.x},${d.y})`)
			.classed('is-cluster', d => d.members.length > 1)
			.classed('is-soon', d => d.members.every(m => m.comingSoon))
			.classed('is-selected', d => d.members.some(m => m.id === selectedId))
			.attr('aria-label', d => d.members.length > 1 ? `${d.members.length} locations: ${d.members.map(m => m.name).join(', ')}. Zoom in.` : `${d.members[0].name}${d.members[0].comingSoon ? ', coming soon' : ''}`);
		g.select('.loc-pin-halo').attr('r', d => (d.members.length > 1 ? 17 : 11) * u);
		g.select('.loc-pin-dot').attr('r', d => (d.members.length > 1 ? 13 : 6.5) * u).attr('stroke-width', 2.5 * u);
		g.select('.loc-pin-count').style('font-size', 13 * u + 'px').text(d => d.members.length > 1 ? d.members.length : '');

		const y = you && projection([you.lon, you.lat]);
		youLayer.selectAll('circle').data(y ? [transform.apply(y)] : []).join('circle').attr('class', 'loc-you').attr('cx', d => d[0]).attr('cy', d => d[1]).attr('r', 6 * u).attr('stroke-width', 3 * u);
		positionTip();
	}

	let tipFor = null;
	function showTip(c) { tipFor = c; positionTip(); }
	function positionTip() {
		const c = tipFor || clusters.find(c => c.members.length === 1 && c.members[0].id === selectedId);
		if (!c) { tip.classed('is-visible', false); return; }
		const live = clusters.find(k => k.key === c.key) || c;
		const scale = root.clientWidth / W;
		// Flip the label under the pin when it would run off the top of the map.
		tip.classed('is-visible', true).classed('is-below', live.y * scale < 64 + 34 * live.members.length)
			.html(live.members.map(m => `<strong>${m.name}</strong>${m.comingSoon ? '<span>Coming soon</span>' : `<span>${m.cityLine}</span>`}`).join(''))
			.style('left', live.x * scale + 'px').style('top', live.y * scale + 'px');
	}

	function activate(c) {
		if (c.members.length > 1) return zoomToPoints(c.members);
		onSelect && onSelect(c.members[0].id);
	}

	function zoomToBounds([[x0, y0], [x1, y1]], maxK = 12) {
		const k = Math.min(maxK, 0.85 / Math.max((x1 - x0) / W, (y1 - y0) / H));
		const t = d3.zoomIdentity.translate(W / 2, H / 2).scale(k).translate(-(x0 + x1) / 2, -(y0 + y1) / 2);
		svg.transition().duration(750).call(zoom.transform, t);
	}
	function zoomToPoints(list, pad = 6) {
		const xs = list.map(p => p.xy[0]), ys = list.map(p => p.xy[1]);
		zoomToBounds([[d3.min(xs) - pad, d3.min(ys) - pad], [d3.max(xs) + pad, d3.max(ys) + pad]], MAX_ZOOM);
	}
	function reset() { svg.transition().duration(750).call(zoom.transform, d3.zoomIdentity); }

	window.addEventListener('resize', draw);
	draw();

	return {
		select(id, { focus = true } = {}) {
			selectedId = id;
			const p = points.find(p => p.id === id);
			if (focus && p) {
				// Fly to the shop: at least city level, and close enough that its pin separates from any neighbor.
				const nearest = d3.min(points.filter(o => o !== p), o => Math.hypot(o.xy[0] - p.xy[0], o.xy[1] - p.xy[1]));
				const k = Math.min(MAX_ZOOM, Math.max(transform.k, 6, 30 * unit() / nearest));
				svg.transition().duration(750).call(zoom.transform, d3.zoomIdentity.translate(W / 2, H / 2).scale(k).translate(-p.xy[0], -p.xy[1]));
			}
			draw();
		},
		showState(code) {
			if (!code) return reset();
			const f = states.find(s => s.properties.name === MAKKEE_STATES[code]);
			if (f) zoomToBounds(path.bounds(f));
		},
		showYou(pos) { you = pos; draw(); },
		zoomBy(f) { svg.transition().duration(300).call(zoom.scaleBy, f); },
		reset
	};
}

function locationCard(loc) {
	const body = loc.comingSoon
		? `<div class="loc-card-tags"><span class="news-tag news-tag-seasonal">Coming soon</span></div>
			<p class="loc-card-soon">We're getting ready to open in ${loc.name}. Follow <a href="https://www.instagram.com/makkeedessert_usa/" target="_blank" rel="noreferrer">@makkeedessert_usa</a> for the opening date.</p>`
		: `<address>${loc.street}<br />${loc.cityLine}</address>
			${loc.hours ? `<p class="loc-card-hours">${loc.hours.join('<br />')}</p>` : ''}
			${loc.phone ? `<p class="loc-card-phone"><a href="tel:${loc.phone.replace(/\D/g, '')}">${loc.phone}</a></p>` : ''}
			<div class="loc-card-actions">
				<a class="under-link" href="${directionsUrl(loc)}" target="_blank" rel="noreferrer">Directions ↗</a>
				${loc.doordash ? `<a class="under-link" href="${loc.doordash}" target="_blank" rel="noreferrer">Order on DoorDash ↗</a>` : ''}
			</div>`;
	return `<li class="loc-card${loc.comingSoon ? ' is-soon' : ''}" id="${loc.id}" data-id="${loc.id}" data-state="${loc.state}">
		<div class="loc-card-head">
			<span class="loc-card-area">${loc.area} · ${loc.state}</span>
			<span class="loc-card-distance" hidden></span>
		</div>
		<h3><button type="button" class="loc-card-title" aria-controls="loc-map">${loc.name}</button></h3>
		${body}
	</li>`;
}

// Locations page: map, filters, list, and "near me" wired together.
function initLocationsPage() {
	const list = document.getElementById('loc-list');
	const status = document.getElementById('loc-status');
	const filters = document.querySelectorAll('.loc-filter[data-state]');
	const nearBtn = document.getElementById('loc-near');
	let order = MAKKEE_LOCATIONS.slice(), activeState = 'all';

	const open = MAKKEE_LOCATIONS.filter(l => !l.comingSoon).length;
	document.querySelectorAll('[data-loc-count]').forEach(el => { el.textContent = open; });
	filters.forEach(b => {
		const n = MAKKEE_LOCATIONS.filter(l => b.dataset.state === 'all' || l.state === b.dataset.state).length;
		b.insertAdjacentHTML('beforeend', ` <span class="loc-filter-count">${n}</span>`);
	});

	function render() {
		list.innerHTML = order.map(locationCard).join('');
		applyFilter();
	}
	function applyFilter() {
		list.querySelectorAll('.loc-card').forEach(c => { c.hidden = activeState !== 'all' && c.dataset.state !== activeState; });
	}

	// The list still works if the map's CDN scripts fail to load.
	const noMap = { select() {}, showState() {}, showYou() {}, zoomBy() {}, reset() {} };
	let map = noMap;
	try { map = createMakkeeMap(document.getElementById('loc-map'), { onSelect: id => select(id, { scroll: true, focusMap: false }) }); }
	catch (err) { console.error('Map failed to load', err); document.querySelector('.loc-map-wrap').hidden = true; }

	function select(id, { scroll = false, focusMap = true } = {}) {
		const loc = MAKKEE_LOCATIONS.find(l => l.id === id);
		if (!loc) return;
		if (activeState !== 'all' && loc.state !== activeState) setState('all', { moveMap: false });
		list.querySelectorAll('.loc-card').forEach(c => c.classList.toggle('is-selected', c.dataset.id === id));
		map.select(id, { focus: focusMap });
		history.replaceState(null, '', '#' + id);
		const card = document.getElementById(id);
		// Scroll inside the list only; never jump the whole page.
		if (scroll && card && list.scrollHeight > list.clientHeight) list.scrollTo({ top: card.offsetTop - list.offsetTop - 8, behavior: 'smooth' });
		status.textContent = `${loc.name} selected.`;
	}
	function setState(state, { moveMap = true } = {}) {
		activeState = state;
		filters.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.state === state)));
		applyFilter();
		if (moveMap) map.showState(state === 'all' ? null : state);
	}

	// Clicking anywhere on a card (except its links) shows that shop on the map.
	const mapWrap = document.querySelector('.loc-map-wrap');
	list.addEventListener('click', e => {
		const card = e.target.closest('.loc-card');
		if (!card || e.target.closest('a')) return;
		select(card.dataset.id);
		// When the map sits above the list (narrow screens), bring it back into view.
		const r = mapWrap.getBoundingClientRect(), header = document.querySelector('.site-header').offsetHeight;
		if (getComputedStyle(mapWrap).position !== 'sticky' && (r.top < header || r.bottom > innerHeight)) scrollTo({ top: scrollY + r.top - header - 12, behavior: 'smooth' });
	});
	filters.forEach(b => b.addEventListener('click', () => setState(b.dataset.state)));
	document.getElementById('loc-zoom-in').addEventListener('click', () => map.zoomBy(2));
	document.getElementById('loc-zoom-out').addEventListener('click', () => map.zoomBy(0.5));
	document.getElementById('loc-reset').addEventListener('click', () => { setState('all'); map.reset(); });

	if (!('geolocation' in navigator)) nearBtn.hidden = true;
	nearBtn.addEventListener('click', () => {
		nearBtn.disabled = true;
		status.textContent = 'Finding your location…';
		navigator.geolocation.getCurrentPosition(pos => {
			const you = { lat: pos.coords.latitude, lon: pos.coords.longitude };
			order = MAKKEE_LOCATIONS.slice().sort((a, b) => (a.comingSoon - b.comingSoon) || milesBetween(you, a) - milesBetween(you, b));
			setState('all', { moveMap: false });
			render();
			order.forEach(l => {
				const el = list.querySelector(`[data-id="${l.id}"] .loc-card-distance`);
				const mi = milesBetween(you, l);
				el.textContent = mi < 10 ? `${mi.toFixed(1)} mi away` : `${Math.round(mi).toLocaleString()} mi away`;
				el.hidden = false;
			});
			map.showYou(you);
			select(order[0].id, { scroll: true });
			list.scrollTo({ top: 0, behavior: 'smooth' });
			status.textContent = `Sorted by distance. Closest shop: ${order[0].name}, about ${Math.round(milesBetween(you, order[0]))} miles away.`;
			nearBtn.disabled = false;
		}, () => {
			status.textContent = 'We couldn’t get your location. Check your browser’s location permission and try again.';
			nearBtn.disabled = false;
		}, { timeout: 10000, maximumAge: 600000 });
	});

	render();
	const hash = location.hash.slice(1);
	if (MAKKEE_LOCATIONS.some(l => l.id === hash)) select(hash);
}

// Home page: a compact map whose pins link to the Locations page, plus a city list by state.
function initHomeMap() {
	const summary = document.getElementById('home-loc-summary');
	if (summary) {
		summary.innerHTML = Object.entries(MAKKEE_STATES).map(([code, name]) => {
			const shops = MAKKEE_LOCATIONS.filter(l => l.state === code);
			return `<div class="visit-detail"><span>${name.toUpperCase()}</span><p>${shops.map(l => `<a href="locations.html#${l.id}">${l.name}</a>${l.comingSoon ? ' <em>(soon)</em>' : ''}`).join(' · ')}</p></div>`;
		}).join('');
	}
	try { createMakkeeMap(document.getElementById('home-map'), { onSelect: id => { location.href = 'locations.html#' + id; } }); }
	catch (err) { console.error('Map failed to load', err); }
}
