/**
 * Standard Drawing Primitives for Chart Overlays
 * This defines the contract between algorithmic logic and the visual rendering layer.
 */

export const ShapeType = {
    LINE: 'line',
    BOX: 'box',
    LABEL: 'label',
    ARROW: 'arrow',
    SIDE_BAR: 'side_bar',
    FILLED_AREA: 'filled_area'
};

export interface LineObjectOptions {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    color: string;
    width?: number;
    style?: string;
}

/**
 * Represents a Line drawing object.
 */
export class LineObject {
    type: string;
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    color: string;
    width: number;
    style: string;

    constructor({ x1, y1, x2, y2, color, width = 1, style = 'solid' }: LineObjectOptions) {
        this.type = ShapeType.LINE;
        this.x1 = x1; // Time (Unix Timestamp or Index)
        this.y1 = y1; // Price
        this.x2 = x2; // Time
        this.y2 = y2; // Price
        this.color = color;
        this.width = width;
        this.style = style; // 'solid', 'dotted', 'dashed'
    }
}

export interface BoxObjectOptions {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    color: string;
    borderColor?: string | null;
    borderWidth?: number;
}

/**
 * Represents a Box/Zone drawing object.
 */
export class BoxObject {
    type: string;
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    color: string;
    borderColor: string;
    borderWidth: number;

    constructor({ x1, y1, x2, y2, color, borderColor = null, borderWidth = 0 }: BoxObjectOptions) {
        this.type = ShapeType.BOX;
        this.x1 = x1; // Start Time
        this.y1 = y1; // Top Price
        this.x2 = x2; // End Time
        this.y2 = y2; // Bottom Price
        this.color = color; // Fill Color (usually rgba)
        this.borderColor = borderColor || color;
        this.borderWidth = borderWidth;
    }
}

export interface LabelObjectOptions {
    x: number;
    y: number;
    text: string;
    color: string;
    textColor?: string;
    fontSize?: number;
    align?: string;
    valign?: string;
}

/**
 * Represents a Text Label object.
 */
export class LabelObject {
    type: string;
    x: number;
    y: number;
    text: string;
    color: string;
    textColor: string;
    fontSize: number;
    align: string;
    valign: string;

    constructor({ x, y, text, color, textColor = 'white', fontSize = 12, align = 'left', valign = 'top' }: LabelObjectOptions) {
        this.type = ShapeType.LABEL;
        this.x = x;
        this.y = y;
        this.text = text;
        this.color = color; // Background color
        this.textColor = textColor;
        this.fontSize = fontSize;
        this.align = align; // 'left', 'center', 'right'
        this.valign = valign; // 'top', 'middle', 'bottom'
    }
}

export interface ArrowObjectOptions {
    x: number;
    y: number;
    direction: 'up' | 'down';
    color: string;
    text?: string;
}

/**
 * Represents an Arrow/Marker object.
 */
export class ArrowObject {
    type: string;
    x: number;
    y: number;
    direction: 'up' | 'down';
    color: string;
    text: string;

    constructor({ x, y, direction, color, text = '' }: ArrowObjectOptions) {
        this.type = ShapeType.ARROW;
        this.x = x;
        this.y = y;
        this.direction = direction; // 'up', 'down'
        this.color = color;
        this.text = text;
    }
}

export interface SideBarObjectOptions {
    y1: number;
    y2: number;
    value: number;
    color: string;
    text: string;
    widthPct?: number;
    align?: string;
}

/**
 * Represents a Side Bar (Volume Delta) object.
 */
export class SideBarObject {
    type: string;
    y1: number;
    y2: number;
    value: number;
    color: string;
    text: string;
    widthPct: number;
    align: string;

    constructor({ y1, y2, value, color, text, widthPct = 0.2, align = 'right' }: SideBarObjectOptions) {
        this.type = ShapeType.SIDE_BAR;
        this.y1 = y1;
        this.y2 = y2;
        this.value = value;
        this.color = color;
        this.text = text;
        this.widthPct = widthPct; // Percentage of chart width to occupy
        this.align = align; // 'left' or 'right'
    }
}

/**
 * A single point of a filled-area polygon: a time with its top and bottom price bounds.
 */
export interface FilledAreaPoint {
    time: number;
    yTop: number;
    yBottom: number;
}

export interface FilledAreaObjectOptions {
    points: FilledAreaPoint[];
    color: string;
}

/**
 * Represents a Filled Area (Polygon) between two series or a line and data.
 * Used for CISD dynamic background fills.
 */
export class FilledAreaObject {
    type: string;
    points: FilledAreaPoint[];
    color: string;

    constructor({ points, color }: FilledAreaObjectOptions) {
        this.type = ShapeType.FILLED_AREA;
        this.points = points; // Array of { time, yTop, yBottom }
        this.color = color;
    }
}
