package edu.byuh.cis.cs203.outwit;

import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.RectF;

/**
 * Represents a cell on the game board.
 */
public class Cell {
    private int logicalX;
    private int logicalY;
    private Team color; // You can use the constants NEUTRAL, DARK, or LIGHT from the Team class.
    private RectF geometry;
    private boolean occupied;

    /**
     * Constructs a Cell object.
     *
     * @param logicalX   The logical X-coordinate of the cell.
     * @param logicalY   The logical Y-coordinate of the cell.
     * @param width      The width of the cell
     * @param height     The height of the cell
     * @param color      The color of the cell (NEUTRAL, DARK, or LIGHT).
     */
    public Cell(int logicalX, int logicalY, Team color, float width, float height) {
        this.logicalX = logicalX;
        this.logicalY = logicalY;
        this.color = color;
        this.geometry = new RectF(logicalX * width, logicalY * height, (logicalX + 1) * width, (logicalY + 1) * height);
    }

    /**
     * Check if the cell is a "home" cell.
     *
     * @return True if the cell is a "home" cell, false otherwise.
     */
    public boolean isHome() {
        // Implement the logic to determine if the cell is a "home" cell.
        // You can use whatever criteria you have for identifying home cells.

        // For example, if home cells are defined as those in a specific range of coordinates:
        // Define the range of coordinates for home cells
        int homeCellXStart; // Adjust as needed
        int homeCellXEnd ;   // Adjust as needed
        int homeCellYStart; // Adjust as needed
        int homeCellYEnd;   // Adjust as needed
        if (color == Team.LIGHT) {
             homeCellXStart = 7; // Adjust as needed
             homeCellXEnd = 9;   // Adjust as needed
             homeCellYStart = 0; // Adjust as needed
             homeCellYEnd = 2;   // Adjust as needed
        }else {
             homeCellXStart = 0; // Adjust as needed
             homeCellXEnd = 2;   // Adjust as needed
             homeCellYStart = 7; // Adjust as needed
             homeCellYEnd = 9;   // Adjust as needed
        }


        // Check if the cell's coordinates fall within the home cell range
        return (logicalX >= homeCellXStart && logicalX <= homeCellXEnd &&
                logicalY >= homeCellYStart && logicalY <= homeCellYEnd);
    }

    /**
     * Gets the logical X-coordinate of the cell.
     *
     * @return The logical X-coordinate.
     */
    public int getLogicalX() {
        return logicalX;
    }

    /**
     * Gets the logical Y-coordinate of the cell.
     *
     * @return The logical Y-coordinate.
     */
    public int getLogicalY() {
        return logicalY;
    }

    /**
     * Gets the color of the cell.
     *
     * @return The color of the cell (NEUTRAL, DARK, or LIGHT).
     */
    public Team getColor() {
        return color;
    }

    /**
     * Mark the cell as being occupied or not by a chip
     *
     * @param isOccupied boolean variable
     */
    public void setOccupied(boolean isOccupied) {
        occupied = isOccupied;
    }

    public boolean isOccupied() {
        return occupied;
    }

    /**
     * Checks if placing a chip on this cell is a legal move.
     *
     * @param c The chip to be placed on the cell.
     * @return True if the move is legal, false otherwise.
     */
    public boolean isLegalMove(Chip c) {
        boolean legal = true;
        if (occupied) {
            legal = false; // if this cell already has another chip on it:
        } else if (c.getCurrentCell().getColor() != Team.NEUTRAL && color == Team.NEUTRAL) {
            legal = false; // the given chip is already in a "home" square but this cell's color is neutral:
        } else if (c.getColor() == color) {
            legal = true;  // the given chip's color is the same as this cell's color:
        } else if (c.getCurrentCell().getColor() == Team.NEUTRAL && color == Team.NEUTRAL) {
            legal = true; // the given chip is already on a neutral square and this cell's color is neutral
        } else if (color != c.getColor()) {
            legal = false; // the cell's color is different than the given chip's color:
        }
        return legal;
    }

    public boolean contains(float x, float y){
        return geometry.contains(x,y);
    }

    /**
     * Basic getter for the geometry field
     * @return the rectangular area on the screen where this cell resides
     */
    public RectF bounds() {
        return geometry;
    }

    /**
     * Draw a legal move marker on the canvas for a given cell.
     *
     * @param canvas The Canvas object on which to draw the marker.
     */
    public void drawLegalMoveMarker(Canvas canvas) {
        Paint markerPaint = new Paint();
        markerPaint.setColor(Color.WHITE);
        canvas.drawCircle(geometry.centerX(), geometry.centerY(), geometry.width() * 0.2f, markerPaint);
    }

    public int manhattanDistance(Cell corner) {
        int dx = Math.abs(this.logicalX - corner.logicalX);
        int dy = Math.abs(this.logicalY - corner.logicalY);
        return dx+dy;
    }
}
