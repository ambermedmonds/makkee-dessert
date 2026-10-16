# Makkee Dessert 麦记牛奶 — USA

Static website for Makkee Dessert's U.S. shops (California, New York, Washington).

Pages: `index.html`, `about.html`, `menu.html`, `locations.html`, `news.html`, sharing `styles.css`. No build step. Open `index.html` in a browser or serve the folder.

## Locations

Every shop lives in the `MAKKEE_LOCATIONS` list at the top of `locations.js`. The Locations page map and list and the home page "Visit us" map are all built from it, so adding or editing a shop there is the only change needed. Mark future shops with `comingSoon: true`.

The map uses d3 and topojson-client from CDNs, plus `data/us-states.js` (state shapes from [us-atlas](https://github.com/topojson/us-atlas), ISC license).
