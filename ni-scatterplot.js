import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
// import { regressionLinear } from "https://unpkg.com/d3-regression@2/dist/d3-regression.min.js";

class NIScatterPlot extends HTMLElement {
  static observedAttributes = ["ratio", "highlightfield", "data"];

  _addStyles() {
    if (document.getElementById("ni-scatterplot-styles")) {
      return;
    }
    const style = document.createElement("style");
    style.id = "ni-scatterplot-styles";
    style.textContent = `


    ni-scatterplot {
      
      --dotsizepx: calc(var(--dotsize, 5) * 1px);
      --activedotsizepx: calc(var(--activedotsize, 7) * 1px);
      --highlightdotsizepx: calc(var(--highlightdotsize, 7) * 1px);
      --highlightdotcolor: var(--highlightdotcolor);
      position: relative;
      container-type: inline-size;
      container-name: ni-linechart;
    }
    ni-scatterplot .inner {
       position: relative;
        @container (width <= 600px) {
          grid-template-columns: 1fr;
        }
    }
    ni-scatterplot select {
      display: block;
      width: 100%;
      margin-block: 1rem;
    }
    ni-scatterplot .inner:has(select) {
      grid-template-rows: 100px 1fr;
    }
    :is(ni-scatterplot.tooltip-side, ni-scatterplot:has(select)) svg {
      grid-row: 1 / 3;
    }
    :is(ni-scatterplot.tooltip-side, ni-scatterplot:has(.inner select)) .inner {
      display: grid;
      grid-template-columns: 1fr calc(var(--tooltipwidth) * 1px);
      place-items: start;
    }
    ni-scatterplot .inner .highlight-dropdown-wrapper {
      grid-row: 1
    }
    ni-scatterplot .inner :is(.highlight-dropdown-wrapper, .ni-tooltip) {
      grid-column: 2;
    }
    ni-scatterplot circle {
      fill: var(--dotColor);
      // opacity: .8;
      r: var(--dotsizepx);
      transition: fill .4s ease, r .4s ease;
    }
    ni-scatterplot circle.highlighted {
      fill: var(--highlightdotcolor);
      r: var(--highlightdotsizepx);
      transition: fill .4s ease, r .4s ease;
    }
    ni-scatterplot circle.active {
      fill: var(--activeDotColor);
      r: var(--activedotsizepx);
      transition: fill .4s ease, r .4s ease;
    }
    ni-scatterplot .ni-tooltip {
    }
    `;
    document.head.appendChild(style);
  }
  constructor() {
    super();
    this.chartloaded = false;
    this.svg = null;

    if (typeof d3 === "undefined") {
      // set message to thius component
      this.textContent = "The d3 javascript library is not found";
      throw new Error("d3 is not loaded");
    }
  }
  connectedCallback() {
    this._scheduleInitialization();
  }

  disconnectedCallback() {
    this._removeListeners();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    // console.log(name, oldValue, newValue);
    if (!this.chartloaded) {
      return;
    }
    this._resetChart();

    // if (name === "data") {
    //   this.data = JSON.parse(newValue);

    // }
    // if (name === "highlightfield" || name === "highlightvalue") {

    //   this._getAttributes();
    //   this._resetChart();
    // }
  }

  _scheduleInitialization() {
    if (!this.isConnected) {
      return;
    }

    if (this._pendingInitFrame !== null) {
      cancelAnimationFrame(this._pendingInitFrame);
    }

    this._pendingInitFrame = requestAnimationFrame(() => {
      this._pendingInitFrame = null;
      this._initialize();
    });
  }
  _initialize() {
    this._addStyles();
    this._setupDefaults();

    if (!this.querySelector("div.inner")) {
      const div = document.createElement("div");
      div.classList.add("inner");
      div.id = this.chartid;
      this.appendChild(div);
      this.chartWrapper = div;
    }
    this._resetChart();
  }

  _resetChart() {
    this._getAttributes();
    this._setChart();
    this._setListeners();
    this._setHighlightDropdown();
  }

  _setListeners() {
    // resize listener
    window.addEventListener("resize", () => {
      this._setChart();
      this._setDynamicWidth(true);
    });
  }

  _removeListeners() {
    window.removeEventListener("resize", this._setChart);
    window.removeEventListener("resize", this._setDynamicWidth);
  }

  _setupDefaults() {
    this.chartid = `ni-scatterplot-${Math.random().toString(36).substr(2, 9)}`;
    this.data = [];
    for (let i = 1; i <= 30; i++) {
      // get 2 random decimals between 0 and 1, to the 3rd decimal place
      const x = parseFloat(Math.random().toFixed(3));
      const y = parseFloat(Math.random().toFixed(3));

      this.data.push({
        home: x,
        overallPercentageHome: y
      });
    }

    this.options = {
      data: this.data,
      dotsize: 5,
      dotColor: "oklch(0.8435 0.1399 93.01)",
      activeDotColor: "oklch(0.8 0.0418 231.42)",
      activedotsize: 7,
      highlightdotsize: 7,
      highlightdotcolor: "oklch(61.719% 0.24781 21.296)",
      highlightselectortext: null,
      linecolor: "oklch(0.8435 0.1399 93.01)",
      xkey: "x",
      ykey: "y",
      xlabel: null,
      ylabel: null,
      height: null,
      width: null,
      chartmargin: { top: 20, right: 20, bottom: 50, left: 70 },
      tooltipfield: null,
      tooltipposition: "near", // options are side and near
      tooltipbackground: "rgba(0, 0, 0, 0.7)",
      tooltipwidth: 250,
      tooltipcolor: "#fff",
      tooltippadding: "10px",
      tooltipborderradius: "3px",
      tooltipsidefoldwidth: 600,
      highlightfield: null,
      highlightvalue: null,
      highlighttoggle: false,
      ratio: 1 // height to width ratio
    };
  }
  _getAttributes() {
    for (const key in this.options) {
      const dataAttr = this.getAttribute(key);

      if (!dataAttr) {
        this[key] = this.options[key];
        this.style.setProperty("--" + key, this.options[key]);
        continue;
      }
      if (key == "data") {
        this.data = JSON.parse(dataAttr);
        this.options.data = this.data;
      } else {
        this.options[key] = dataAttr;
        this[key] = this.options[key];
        this.style.setProperty("--" + key, this.options[key]);
      }
    }

    if (!this.width) {
      this._setDynamicWidth();
    }
  }
  _setUpTooltip() {
    if (!this.tooltipfield) {
      return;
    }
    this.tooltip = document.createElement("div");
    this.tooltip.style.background = this.tooltipbackground;
    this.tooltip.style.color = this.tooltipcolor;
    this.tooltip.style.padding = this.tooltippadding;
    this.tooltip.style.borderRadius = this.tooltipborderradius;
    this.tooltip.style.pointerEvents = "none";
    this.tooltip.style.display = "none";
    this.classList.add("tooltip-" + this.tooltipposition);
    this.tooltip.classList.add("ni-tooltip");
    if (this.tooltipposition == "near") {
      // ANCHOR POSITION NOT READY FOR PRIMETIME AT BUILD TIME - https://github.com/w3c/csswg-drafts/issues/11301
      this.tooltip.style.position = "absolute";
      this.tooltip.style.top = "var(--tooltip-top)";
      this.tooltip.style.left = "var(--tooltip-left)";
    }

    if (this.chartWrapper) {
      this.chartWrapper.appendChild(this.tooltip);
    } else {
      this.appendChild(this.tooltip);
    }
  }
  _setHighlightDropdown() {
    if (
      !this.highlightfield ||
      !this.highlighttoggle ||
      !this.highlightvalue ||
      !this.chartWrapper
    ) {
      return;
    }
    const $this = this;
    const existingHighlightDropdown = this.querySelector(".highlight-dropdown-wrapper");
    if (existingHighlightDropdown) {
      existingHighlightDropdown.remove();
    }
    const uniqueValues = Array.from(new Set(this.data.map((item) => item[this.highlightfield])));

    // sort uniqueValues
    uniqueValues.sort();
    this.highlightDropdownWrapper = document.createElement("div");
    this.highlightDropdownWrapper.classList.add("highlight-dropdown-wrapper");
    this.highlightDropdown = document.createElement("select");
    this.highlightDropdown.id = "highlightDropdown-" + this.chartid;

    uniqueValues.forEach((value) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = value;
      if (option.value == $this.highlightvalue) {
        option.selected = true;
      }
      this.highlightDropdown.appendChild(option);
    });

    if (this.highlightselectortext) {
      const label = document.createElement("label");
      label.textContent = this.highlightselectortext;
      label.setAttribute("for", this.highlightDropdown.id);
      this.highlightDropdownWrapper.appendChild(label);
    }
    // this.appendChild(this.highlightDropdown);
    this.highlightDropdownWrapper.appendChild(this.highlightDropdown);
    this.chartWrapper.appendChild(this.highlightDropdownWrapper);
    this.highlightDropdown.addEventListener("change", (event) => {
      this.highlightvalue = event.target.value;
      this._setChart();
    });
  }
  _setDynamicWidth(r = false) {
    if (this.parentElement) {
      if (
        ((this.tooltipfield && this.tooltipposition == "side") || this.highlighttoggle) &&
        this.parentElement.offsetWidth > this.tooltipsidefoldwidth
      ) {
        this.width = this.parentElement.offsetWidth - this.tooltipwidth;
        this.options.width = this.width;
        this.style.setProperty("--tooltipFlexDirection", "row");
      } else {
        this.width = this.parentElement.offsetWidth;
        this.options.width = this.width;
        this.style.setProperty("--tooltipFlexDirection", "column");
      }

      if (!this.height || r) {
        this.height = this.width / this.ratio;
        this.options.height = this.height;
      }
    }
  }
  _setClass(d, i) {
    if (
      this.highlightfield &&
      this.highlightvalue &&
      d[this.highlightfield] &&
      d[this.highlightfield] == this.highlightvalue
    ) {
      return "highlighted";
    }
    return "";
  }
  async _setDotClasses() {
    if (!this.svg) {
      return;
    }
    let $this = this;

    await this.svg.selectAll("circle").attr("class", function (d) {
      return $this._setClass(d);
    });
    return;
    // not working
    /*
    const circles = this.querySelectorAll("circle");
    circles.forEach((circle) => {
      const d = JSON.parse(circle.getAttribute("data-obj"));
      circle.setAttribute("class", this._setClass(d));
    });
    */
  }

  _moveHighlightedToFront() {
    const circles = this.querySelectorAll("circle");
    circles.forEach((circle) => {
      if (circle.classList.contains("highlighted")) {
        circle.parentNode.appendChild(circle);
      }
    });
  }
  _setAttributes(changes) {
    for (const key in changes) {
      if (changes.hasOwnProperty(key)) {
        this.setAttribute(key, changes[key]);
        this[key] = changes[key];
      }
    }
    this._resetChart();
  }

  async _setChart() {
    console.log("setting chart");
    const $this = this;
    console.log(this.highlightvalue);

    d3.selectAll("#" + this.chartid + " > *:not(.highlight-dropdown-wrapper)").remove();

    const margin = this.chartmargin;

    const innerWidth = this.width - margin.left - margin.right;
    const innerHeight = this.height - margin.top - margin.bottom;

    this.svg = d3
      .select("#" + this.chartid)
      .append("svg")
      .attr("width", this.width)
      .attr("height", this.height)
      .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    // const x = d3.scaleLinear().range([0, innerWidth]);
    // const y = d3.scaleLinear().range([innerHeight, 0]);
    // dynamically set x and y scales based on data
    const x = d3.scaleLinear().range([0, innerWidth]);
    const y = d3.scaleLinear().range([innerHeight, 0]);
    if ($this.data && $this.data.length > 0) {
      x.domain(d3.extent($this.data, (d) => d[$this.options.xkey]));
      y.domain(d3.extent($this.data, (d) => d[$this.options.ykey]));
    }

    this.svg
      .append("g")
      .attr("transform", "translate(0," + innerHeight + ")")
      .call(d3.axisBottom(x));

    this.svg.append("g").call(d3.axisLeft(y));
    if (this.xlabel) {
      this.svg
        .append("text")
        .attr("text-anchor", "end")
        .attr("x", margin.left + innerWidth / 2)
        .attr("y", this.height - margin.bottom + 20)
        .attr("class", "axis")
        .attr("fill", $this.linecolor)
        .text($this.xlabel);
    }
    if (this.ylabel) {
      // Y axis label:
      this.svg
        .append("text")
        .attr("text-anchor", "end")
        .attr("transform", "rotate(-90)")
        .attr("color", "white")
        .attr("y", -margin.left + 20)
        .attr("x", margin.bottom + innerHeight / -2)
        .attr("class", "axis")
        .attr("fill", $this.linecolor)
        .text($this.ylabel);
    }
    this.svg
      .append("g")
      .selectAll("dot")

      .data($this.data)
      .enter()
      .append("circle")
      .attr("cx", function (d) {
        return x(d[$this.options.xkey]);
      })
      .attr("cy", function (d) {
        return y(d[$this.options.ykey]);
      })

      .transition()
      .attr("r", 5);

    await this._setDotClasses();

    await this._moveHighlightedToFront();

    $this._setUpTooltip();
    if (this.tooltipfield) {
      $this.svg
        .selectAll("circle")
        .on("mouseover", function (d, i) {
          $this._setTooltip(d, i);
        })
        .on("mouseout", function () {
          // activeHover.value = null;
        });
    }
    this.chartloaded = true;
  }
  _setTooltip(d, i) {
    let $this = this;
    const tooltipValue = i[$this.tooltipfield];
    const dotBounds = d.target.getBoundingClientRect();
    const innerBounds = $this.chartWrapper.getBoundingClientRect();

    d.target.style.cursor = "pointer";
    $this.tooltip.innerHTML = tooltipValue;
    $this.tooltip.style.display = "block";

    let actives = document.querySelectorAll("#" + $this.chartid + " circle.active");
    actives.forEach((active) => {
      active.classList.remove("active");
    });
    d.target.classList.add("active");

    const pageX = dotBounds.left - innerBounds.left + dotBounds.width / 2;
    const pageY = dotBounds.top - innerBounds.top + dotBounds.height / 2;

    const subtraction = 50;
    const addition = 30;

    $this.style.setProperty("--tooltip-top", pageY + addition + "px");
    $this.style.setProperty("--tooltip-left", pageX - subtraction + "px");
  }
}

customElements.define("ni-scatterplot", NIScatterPlot);

/*
<circle cx="488.86999999999995" cy="51.3" data-obj="{&quot;home&quot;:0.886,&quot;overallPercentageHome&quot;:0.589,&quot;team&quot;:&quot;PHILADELPHIA 76ERS&quot;,&quot;difference&quot;:0.297,&quot;tooltip&quot;:&quot;Year: 2020Team: PHILADELPHIA 76ERSHome Win %: 0.886Overall Win %: 0.589Difference: 0.297&quot;}" r="5" style="fill: orange;"></circle>

*/
