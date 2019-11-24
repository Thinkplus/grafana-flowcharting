import TooltipHandler from './tooltipHandler';
import XGraph from './graph_class';
import Rule from 'rule_class';
import * as gf from '../types/flowcharting';

import FlowChartingPlugin from 'plugin';
declare var GFP: FlowChartingPlugin;

/**
 * Class for state of one cell
 *
 * @export
 * @class State
 */
export default class State {
  mxcell: any;
  cellId: string;
  newcellId?: string; // for inspect mode
  previousId?: string; // for inspect mode
  edited?: boolean; // if modified in inspector
  edit?: boolean; // if modified in inspector
  xgraph: XGraph;
  changed = false;
  changedShape = false;
  changedStyle: gf.TIStylesBoolean;
  changedText = false;
  changedLink = false;
  matched = false;
  matchedShape = false;
  matchedStyle: gf.TIStylesBoolean;
  matchedText = false;
  matchedLink = false;
  globalLevel = -1;
  styleKeys: gf.TStyleArray = ['fillColor', 'strokeColor', 'fontColor', 'imageBorder', 'imageBackground'];
  level: gf.TIStylesNumber;
  tooltipHandler: TooltipHandler | null = null;
  currentColors: gf.TIStylesString;
  originalColors: gf.TIStylesString;
  originalStyle: string;
  originalText: string;
  currentText: string;
  originalLink: string | null;
  currentLink: string | null;
  overlayIcon = false;
  changedIcon = false;
  /**
   * Creates an instance of State.
   * @param {mxCell} mxcell
   * @param {XGraph} xgraph
   * @memberof State
   */
  constructor(mxcell: gf.mxCell, xgraph: XGraph) {
    GFP.log.info('State.constructor()');
    this.mxcell = mxcell;
    this.cellId = mxcell.id;
    this.xgraph = xgraph;
    // If Cell is modified
    this.changedStyle = State.getDefaultFlagStyles();

    // If state is target
    this.matchedStyle = State.getDefaultFlagStyles();
    this.level = State.getDefaultLevelStyles();
    this.tooltipHandler = null;
    this.mxcell.GF_tooltipHandler = null;
    this.currentColors = State.getDefaultValueStyles();
    this.originalColors = State.getDefaultValueStyles();
    this.originalStyle = mxcell.getStyle();
    this.originalText = this.xgraph.getLabel(mxcell);
    this.currentText = this.originalText;
    let link = this.xgraph.getLink(mxcell);
    if (link === undefined) {
      link = null;
    }
    this.originalLink = link;
    this.currentLink = link;
    this.styleKeys.forEach(style => {
      const color: string | null = this.xgraph.getStyleCell(mxcell, style);
      this.currentColors[style] = color;
      this.originalColors[style] = color;
    });
  }

  static getDefaultValueStyles(): gf.TIStylesString {
    return {
      fillColor: null,
      strokeColor: null,
      fontColor: null,
      imageBorder: null,
      imageBackground: null,
    };
  }

  static getDefaultLevelStyles(): gf.TIStylesNumber {
    return {
      fillColor: -1,
      strokeColor: -1,
      fontColor: -1,
      imageBorder: -1,
      imageBackground: -1,
    };
  }

  static getDefaultFlagStyles(): gf.TIStylesBoolean {
    return {
      fillColor: false,
      strokeColor: false,
      fontColor: false,
      imageBorder: false,
      imageBackground: false,
    };
  }

  /**
   * Call applyState() asynchronously
   *
   * @memberof State
   */
  async async_applyState() {
    // new Promise (this.applyState.bind(this));
    this.applyState();
  }

  /**
   * Define state according to 1 rule and 1 serie without apply display
   *
   * @param {Rule} rule
   * @param {any} serie
   * @memberof State
   */
  setState(rule: Rule, serie: any) {
    GFP.log.info('State.setState()');
    // GFP.log.debug('State.setState() Rule', rule);
    // GFP.log.debug('State.setState() Serie', serie);
    if (!rule.isHidden() && rule.matchSerie(serie)) {
      const shapeMaps = rule.getShapeMaps();
      const textMaps = rule.getTextMaps();
      const linkMaps = rule.getLinkMaps();
      const value = rule.getValueForSerie(serie);
      const FormattedValue = rule.getFormattedValue(value);
      const level = rule.getThresholdLevel(value);
      const color = rule.getColorForLevel(level);

      // SHAPE
      let cellProp = this.getCellProp(rule.data.shapeProp);
      shapeMaps.forEach(shape => {
        if (!shape.isHidden() && shape.match(cellProp)) {
          this.matchedShape = true;
          this.matched = true;
          // Test
          // this.mxcell.serie = serie;
          // tooltips
          if (rule.toTooltipize(level)) {
            // Metrics
            if (this.tooltipHandler === null || this.tooltipHandler === undefined) {
              this.tooltipHandler = new TooltipHandler(this.mxcell);
            }
            let tpColor: string | null = null;
            const label = rule.data.tooltipLabel == null || rule.data.tooltipLabel.length === 0 ? serie.alias : rule.data.tooltipLabel;
            if (rule.data.tooltipColors) {
              tpColor = color;
            }
            const metric = this.tooltipHandler
              .addMetric()
              .setLabel(label)
              .setValue(FormattedValue)
              .setColor(tpColor)
              .setDirection(rule.data.tpDirection);
            // Graph
            if (rule.data.tpGraph) {
              const graph = metric.addGraph(rule.data.tpGraphType);
              graph
                .setColor(tpColor)
                .setSerie(serie)
                .setSize(rule.data.tpGraphSize)
                .setScaling(rule.data.tpGraphLow, rule.data.tpGraphHigh);
            }
            // Date
            this.tooltipHandler.updateDate();
          }

          // Color Shape
          if (this.globalLevel <= level) {
            this.setLevelStyle(rule.data.style, level);
            if (rule.toColorize(level)) {
              this.setColorStyle(rule.data.style, color);
              this.matchedStyle[rule.data.style] = true;
            } else if (this.changedShape) {
              if (this.changedStyle[rule.data.style]) {
                this.unsetColorStyle(rule.data.style);
              }
            }
            this.overlayIcon = rule.toIconize(level);
            if (level >= rule.highestLevel) {
              rule.highestLevel = level;
              rule.highestFormattedValue = FormattedValue;
              rule.highestColor = color;
            }
          }
        }
      });

      // TEXT
      cellProp = this.getCellProp(rule.data.textProp);
      textMaps.forEach(text => {
        if (!text.isHidden() && text.match(cellProp)) {
          this.matchedText = true;
          this.matched = true;
          if (rule.toLabelize(level)) {
            const textScoped = GFP.replaceWithText(FormattedValue);
            this.setText(rule.getReplaceText(this.currentText, textScoped));
          } else {
            // Hide text
            this.setText(rule.getReplaceText(this.currentText, ''));
          }
          if (level >= rule.highestLevel) {
            rule.highestLevel = level;
            rule.highestFormattedValue = FormattedValue;
            rule.highestColor = color;
          }
        }
      });

      // LINK
      cellProp = this.getCellProp(rule.data.linkProp);
      linkMaps.forEach(link => {
        if (!link.isHidden() && link.match(cellProp)) {
          this.matchedLink = true;
          this.matched = true;
          if (this.globalLevel <= level) {
            if (rule.toLinkable(level)) {
              const linkScoped = GFP.replaceWithText(rule.getLink());
              this.setLink(linkScoped);
            }
            if (level >= rule.highestLevel) {
              rule.highestLevel = level;
              rule.highestFormattedValue = FormattedValue;
              rule.highestColor = color;
            }
          }
        }
      });
    }
    GFP.log.debug('State.setState() state', this);
  }

  /**
   * Restore initial status of state without apply display.
   * Use applyState() to apply on graph (color, level and text)
   *
   * @memberof State
   */
  unsetState() {
    GFP.log.info('State.unsetState()');
    this.unsetLevel();
    // this.unsetColor(); Replace by reset
    this.resetStyle();
    this.unsetText();
    this.unsetLink();
    this.unsetTooltip();
    this.matched = false;
    this.matchedShape = false;
    this.styleKeys.forEach(key => {
      this.matchedStyle[key] = false;
    });
    this.matchedText = false;
    this.matchedLink = false;
  }

  /**
   * Flag to indicate state is matching by a rule and series
   *
   * @returns {boolean}
   * @memberof State
   */
  isMatched(): boolean {
    return this.matched;
  }

  /**
   * Flag to indicate state is changed, need apply state
   *
   * @returns {boolean}
   * @memberof State
   */
  isChanged(): boolean {
    return this.changed;
  }

  /**
   *
   *
   * @param {string} prop - id|value
   * @returns {string} return original value of id or label of cell
   * @memberof State
   */
  getCellProp(prop: gf.TPropertieKey) {
    if (prop === 'id') {
      return this.cellId;
    }
    if (prop === 'value') {
      return this.originalText;
    }
    return '/!\\ Not found';
  }

  /**
   * Define color for a style
   *
   * @param {string} style - fillcolor|fontcolor|stroke
   * @param {string} color - html color
   * @memberof State
   */
  setColorStyle(style: gf.TStyleKey, color: string) {
    GFP.log.info('State.setColorStyle()');
    this.currentColors[style] = color;
  }

  /**
   * Return color of style
   *
   * @param {gf.TStyleKey} style
   * @memberof State
   */
  getColorStyle(style: gf.TStyleKey): string | null {
    return this.currentColors[style];
  }

  /**
   * Reset color with initial color
   *
   * @param {string} style - fillcolor|fontcolor|stroke
   * @memberof State
   */
  unsetColorStyle(style: gf.TStyleKey) {
    this.currentColors[style] = this.originalColors[style];
  }

  /**
   * Restore initial color of cell
   *
   * @memberof State
   */
  unsetColor() {
    this.styleKeys.forEach(style => {
      this.unsetColorStyle(style);
    });
  }

  /**
   * Reset default level (-1) for the style
   *
   * @param {string} style - fillcolor|fontcolor|stroke
   * @memberof State
   */
  unsetLevelStyle(style: gf.TStyleKey) {
    this.level[style] = -1;
  }

  /**
   * Reset tooltip
   *
   * @memberof State
   */
  unsetTooltip() {
    if (this.tooltipHandler !== null) {
      this.tooltipHandler.destroy();
    }
    this.tooltipHandler = null;
  }

  /**
   * Reset level to -1 for all style
   *
   * @memberof State
   */
  unsetLevel() {
    this.styleKeys.forEach((style: gf.TStyleKey) => {
      this.unsetLevelStyle(style);
    });
    this.globalLevel = -1;
  }

  /**
   * Attribute a level for a style
   *
   * @param {TStyleKeyDisable} style
   * @param {number} level
   * @memberof State
   */
  setLevelStyle(style: gf.TStyleKey, level: number) {
    GFP.log.info('State.setLevelStyle()');
    this.level[style] = level;
    if (this.globalLevel < level) {
      this.globalLevel = level;
    }
  }

  /**
   * Retrun the level for a style
   *
   * @param {TStyleKey} style
   * @returns {number}
   * @memberof State
   */
  getLevelStyle(style: gf.TStyleKey): number {
    return this.level[style];
  }

  /**
   * Get the highest/global level
   *
   * @returns {number}
   * @memberof State
   */
  getLevel(): number {
    return this.globalLevel;
  }

  /**
   * Return the label level of current level
   *
   * @returns {string}
   * @memberof State
   */
  getTextLevel(): string {
    const level = this.getLevel();
    switch (level) {
      case -1:
        return 'NO DATA';
      case 0:
        return 'OK';
      case 1:
        return 'WARN';
      case 2:
        return 'ERROR';
      default:
        return 'NULL';
    }
  }

  /**
   * Attribute new label
   *
   * @param {string} text
   * @memberof State
   */
  setText(text: string) {
    this.currentText = text;
  }

  /**
   * Reset the current label with the initial label
   *
   * @memberof State
   */
  unsetText() {
    this.currentText = this.originalText;
  }

  /**
   * Assign new link
   *
   * @param {string} url
   * @memberof State
   */
  setLink(url: string) {
    this.currentLink = url;
  }

  /**
   * Reset current link with original/initial link
   *
   * @memberof State
   */
  unsetLink() {
    this.currentLink = this.originalLink;
  }

  /**
   * Add metric to tooltip of shape
   *
   * @memberof State
   */
  addTooltip() {
    GFP.log.info('State.addTooltipValue()');
    if (this.tooltipHandler == null) {
      this.tooltipHandler = new TooltipHandler(this.mxcell);
    }
    this.tooltipHandler.addMetric();
  }

  updateTooltipDate() {
    if (this.tooltipHandler) {
      this.tooltipHandler.updateDate();
    }
  }

  /**
   * Return true if is a shape/vertex
   *
   * @returns
   * @memberof State
   */
  isShape(): boolean {
    return this.mxcell.isVertex();
  }

  /**
   * Return true if is a arrow/connector
   *
   * @returns
   * @memberof State
   */
  isConnector(): boolean {
    return this.mxcell.isEdge();
  }

  /**
   * Apply and draw new shape color and form
   *
   * @memberof State
   */
  applyShape() {
    this.changedShape = true;
    this.applyStyle();
    this.applyIcon();
  }

  applyStyle() {
    this.styleKeys.forEach(key => {
      if (this.matchedStyle[key]) {
        const color = this.currentColors[key];
        this.xgraph.setStyleCell(this.mxcell, key, color, true);
        if (color !== this.originalColors[key]) {
          this.changedStyle[key] = true;
        }
      }
    });
  }

  applyIcon() {
    // Apply icons
    if (this.overlayIcon) {
      this.changedIcon = true;
      this.xgraph.addOverlay(this.getTextLevel(), this.mxcell);
    } else {
      this.xgraph.removeOverlay(this.mxcell);
    }
  }

  resetShape() {
    this.changedShape = false;
    this.resetStyle();
    this.resetIcon();
  }

  resetIcon() {
    this.changedIcon = false;
    this.xgraph.removeOverlay(this.mxcell);
  }

  /**
   * unset et apply, reset to old style
   *
   * @memberof State
   */
  resetStyle() {
    this.unsetColor();
    this.xgraph.setStyles(this.mxcell, this.originalStyle);
    this.styleKeys.forEach(key => {
      this.changedStyle[key] = false;
    });
  }

  /**
   * Apply new label
   *
   * @memberof State
   */
  applyText() {
    this.changedText = true;
    this.xgraph.setLabelCell(this.mxcell, this.currentText);
  }

  resetText() {
    this.changedText = false;
    this.unsetText();
    this.xgraph.setLabelCell(this.mxcell, this.originalText);
  }

  /**
   * Apply new link
   *
   * @memberof State
   */
  applyLink() {
    this.changedLink = true;
    this.xgraph.addLink(this.mxcell, this.currentLink);
  }

  resetLink() {
    this.changedLink = false;
    this.unsetLink();
    this.xgraph.addLink(this.mxcell, this.originalLink);
  }

  /**
   * Apply new tooltip
   *
   * @memberof State
   */
  applyTooltip() {
    if (this.tooltipHandler != null && this.tooltipHandler.isChecked()) {
      this.mxcell.GF_tooltipHandler = this.tooltipHandler;
    }
  }

  /**
   * Apply new state
   *
   * @memberof State
   */
  applyState() {
    GFP.log.info('State.applyState()');
    if (this.matched) {
      this.changed = true;

      // TOOLTIP
      this.applyTooltip();

      // SHAPES
      if (this.matchedShape) {
        this.applyShape();
      } else if (this.changedShape) {
        this.resetShape();
      }

      // TEXTS
      if (this.matchedText) {
        this.applyText();
      } else if (this.changedText) {
        this.resetText();
      }

      // LINKS
      if (this.matchedLink) {
        this.applyLink();
      } else if (this.changedLink) {
        this.resetLink();
      }
    } else if (this.changed) {
      this.reset();
    }
  }

  /**
   * Reset and restore state
   *
   * @memberof State
   */
  reset() {
    this.resetShape();
    this.resetText();
    this.resetLink();
    this.changed = false;
  }

  /**
   * Prepare state for a new rule and serie
   *
   * @memberof State
   */
  prepare() {
    if (this.changed) {
      this.unsetLevel();
      this.unsetTooltip();
      this.unsetText();
      this.matched = false;
      this.matchedShape = false;
      this.matchedText = false;
      this.matchedLink = false;
    }
  }

  /**
   * Highlight mxcell
   *
   * @memberof State
   */
  highlightCell() {
    this.xgraph.highlightCell(this.mxcell);
  }

  /**
   * Unhighlight mxcell
   *
   * @memberof State
   */
  unhighlightCell() {
    this.xgraph.unhighlightCell(this.mxcell);
  }
}
