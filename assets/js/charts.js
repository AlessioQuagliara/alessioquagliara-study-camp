/* UniNettuno Study Camp — charts.js
   Grafici SVG minimali, senza dipendenze esterne. */
(function (global) {
  'use strict';
  var US = global.US;
  var u = US.utils;

  function svgEl(tag, attrs) {
    var el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    Object.keys(attrs || {}).forEach(function (k) { el.setAttribute(k, attrs[k]); });
    return el;
  }

  /* Barre verticali semplici. data: [{label, value}] */
  function barChart(container, data, opts) {
    opts = opts || {};
    container.innerHTML = '';
    if (!data.length) { container.innerHTML = '<p class="chart-empty">Nessun dato ancora.</p>'; return; }
    var w = opts.width || container.clientWidth || 320;
    var h = opts.height || 160;
    var padBottom = 24, padTop = 10;
    var max = Math.max.apply(null, data.map(function (d) { return d.value; }).concat([opts.min || 1]));
    var barW = (w / data.length) * 0.6;
    var gap = (w / data.length) * 0.4;
    var svg = svgEl('svg', { viewBox: '0 0 ' + w + ' ' + h, width: '100%', height: h, role: 'img', 'aria-label': opts.ariaLabel || 'Grafico a barre' });
    data.forEach(function (d, i) {
      var x = i * (barW + gap) + gap / 2;
      var barH = max > 0 ? ((h - padBottom - padTop) * (d.value / max)) : 0;
      var y = h - padBottom - barH;
      var rect = svgEl('rect', {
        x: x.toFixed(1), y: y.toFixed(1), width: barW.toFixed(1), height: barH.toFixed(1),
        rx: 3, class: 'chart-bar' + (d.cls ? ' ' + d.cls : '')
      });
      var title = svgEl('title', {});
      title.textContent = d.label + ': ' + d.value;
      rect.appendChild(title);
      svg.appendChild(rect);
      var label = svgEl('text', { x: (x + barW / 2).toFixed(1), y: h - 6, class: 'chart-label' });
      label.textContent = d.label;
      svg.appendChild(label);
      if (opts.showValue) {
        var val = svgEl('text', { x: (x + barW / 2).toFixed(1), y: (y - 4).toFixed(1), class: 'chart-value' });
        val.textContent = d.value;
        svg.appendChild(val);
      }
    });
    container.appendChild(svg);
  }

  /* Sparkline a linea. values: [n,n,n...] */
  function sparkline(container, values, opts) {
    opts = opts || {};
    container.innerHTML = '';
    if (!values.length) { container.innerHTML = '<p class="chart-empty">Nessun dato.</p>'; return; }
    var w = opts.width || container.clientWidth || 280;
    var h = opts.height || 60;
    var max = Math.max.apply(null, values.concat([1]));
    var min = Math.min.apply(null, values.concat([0]));
    var range = (max - min) || 1;
    var step = w / Math.max(1, values.length - 1);
    var points = values.map(function (v, i) {
      var x = i * step;
      var y = h - ((v - min) / range) * (h - 8) - 4;
      return x.toFixed(1) + ',' + y.toFixed(1);
    }).join(' ');
    var svg = svgEl('svg', { viewBox: '0 0 ' + w + ' ' + h, width: '100%', height: h, role: 'img', 'aria-label': opts.ariaLabel || 'Andamento' });
    var polyline = svgEl('polyline', { points: points, class: 'chart-spark' });
    svg.appendChild(polyline);
    container.appendChild(svg);
  }

  /* Donut per distribuzione (es. mastery). data: [{label, value, cls}] */
  function donut(container, data, opts) {
    opts = opts || {};
    container.innerHTML = '';
    var total = data.reduce(function (s, d) { return s + d.value; }, 0);
    if (!total) { container.innerHTML = '<p class="chart-empty">Nessun dato.</p>'; return; }
    var size = opts.size || 140;
    var r = size / 2 - 12;
    var cx = size / 2, cy = size / 2;
    var circumference = 2 * Math.PI * r;
    var svg = svgEl('svg', { viewBox: '0 0 ' + size + ' ' + size, width: size, height: size, role: 'img', 'aria-label': opts.ariaLabel || 'Distribuzione' });
    var bg = svgEl('circle', { cx: cx, cy: cy, r: r, class: 'donut-bg', fill: 'none', 'stroke-width': 14 });
    svg.appendChild(bg);
    var offset = 0;
    data.forEach(function (d) {
      if (!d.value) return;
      var frac = d.value / total;
      var len = frac * circumference;
      var circle = svgEl('circle', {
        cx: cx, cy: cy, r: r, fill: 'none', 'stroke-width': 14,
        class: 'donut-seg ' + (d.cls || ''),
        'stroke-dasharray': len.toFixed(1) + ' ' + (circumference - len).toFixed(1),
        'stroke-dashoffset': (-offset).toFixed(1),
        transform: 'rotate(-90 ' + cx + ' ' + cy + ')'
      });
      var title = svgEl('title', {});
      title.textContent = d.label + ': ' + d.value;
      circle.appendChild(title);
      svg.appendChild(circle);
      offset += len;
    });
    var wrap = document.createElement('div');
    wrap.className = 'donut-wrap';
    wrap.appendChild(svg);
    var legend = document.createElement('ul');
    legend.className = 'donut-legend';
    data.forEach(function (d) {
      if (!d.value) return;
      var li = document.createElement('li');
      li.innerHTML = '<span class="legend-dot ' + (d.cls || '') + '"></span>' + u.escapeHTML(d.label) + ' <b>' + d.value + '</b>';
      legend.appendChild(li);
    });
    wrap.appendChild(legend);
    container.appendChild(wrap);
  }

  US.charts = { barChart: barChart, sparkline: sparkline, donut: donut };
})(window);
