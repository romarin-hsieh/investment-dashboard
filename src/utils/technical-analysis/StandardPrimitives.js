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

/**
 * Represents a Line drawing object.
 */
export class LineObject {
    constructor({ x1, y1, x2, y2, color, width = 1, style = 'solid' }) {
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

/**
 * Represents a Box/Zone drawing object.
 */
export class BoxObject {
    constructor({ x1, y1, x2, y2, color, borderColor = null, borderWidth = 0 }) {
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

/**
 * Represents a Text Label object.
 */
export class LabelObject {
    constructor({ x, y, text, color, textColor = 'white', fontSize = 12, align = 'left', valign = 'top' }) {
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

/**
 * Represents an Arrow/Marker object.
 */
export class ArrowObject {
    constructor({ x, y, direction, color, text = '' }) {
        this.type = ShapeType.ARROW;
        this.x = x;
        this.y = y;
        this.direction = direction; // 'up', 'down'
        this.color = color;
        this.text = text;
    }
}

/**
 * Represents a Side Bar (Volume Delta) object.
 */
export class SideBarObject {
    constructor({ y1, y2, value, color, text, widthPct = 0.2, align = 'right' }) {
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
 * Represents a Filled Area (Polygon) between two series or a line and data.
 * Used for CISD dynamic background fills.
 */
export class FilledAreaObject {
    constructor({ points, color }) {
        this.type = ShapeType.FILLED_AREA;
        this.points = points; // Array of { time, yTop, yBottom }
        this.color = color;
    }
}
