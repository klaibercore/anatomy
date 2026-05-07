# Anatomy

An interactive human anatomy learning website. Click on parts of the body to learn their names, locations, and functions. Built to scale — start with the skeletal system and add more later.

## Structure

```
anatomy/
├── index.html               ← topic hub / landing page
├── topics/                  ← one HTML file per body system
│   ├── skeletal.html
│   └── ...
├── data/                    ← JSON data for each topic
│   ├── skeletal.json
│   └── ...
├── assets/                  ← SVG illustrations
│   └── skeleton.svg
├── css/
│   └── style.css
├── js/
│   ├── app.js               ← core interaction engine
│   └── data.js              ← topic registry
└── README.md
```

## Adding a New Topic

1. Create `topics/new-system.html` following the skeletal template
2. Create `data/new-system.json` with the structure data
3. Add the SVG to `assets/`
4. Register in `js/data.js`

## Run

Open `index.html` in any browser. Zero build tools.

