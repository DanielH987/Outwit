package edu.byuh.cis.cs203.outwit;

import android.content.Context;
import android.content.res.Resources;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.PointF;
import android.graphics.Rect;
import android.graphics.RectF;
import android.util.Log;

import java.util.ArrayList;
import java.util.List;

import edu.byuh.cis.cs203.outwit.activities.Preferences;
import edu.byuh.cis.cs203.outwit.themes.Theme;

/**
 * Represents a game chip.
 */
public class Chip {
    private final Team color;
    private Cell currentCell;
    private final boolean isPowerChip;
    private boolean selected;
    private static  Paint darkChipPaint;
    private static  Paint lightChipPaint;
    private static  Paint powerChipPaint;
    private PointF velocity;
    private RectF currentPosition;
    private Cell destination;
    private static Theme theme;
    private Bitmap chipBitmap;
    public static void initializeStaticPaints(Context context) {
        theme = Preferences.getThemePref(context);
        Resources resources = context.getResources();

        darkChipPaint = new Paint();
        darkChipPaint.setColor(theme.getDarkCellColor());

        lightChipPaint = new Paint();
        lightChipPaint.setColor(theme.getLightCellColor());

        powerChipPaint = new Paint();
        powerChipPaint.setColor(theme.getPowerColor());
    }

    /**
     * Creates a new chip.
     *
     * @param color       The color of the chip.
     * @param isPowerChip Indicates whether the chip is a power chip.
     */
    public Chip(Team color, boolean isPowerChip) {
        this.color = color;
        this.isPowerChip = isPowerChip;
        this.selected = false;
        this.velocity = new PointF();
        this.currentPosition = new RectF();
        this.destination = null;
    }

    /**
     * Sets the bitmap for the chip.
     *
     * @param context The context to get resources.
     * @param bitmapResId The resource ID of the bitmap to use for the chip.
     */
    public void setChipBitmap(Context context, int bitmapResId) {
        chipBitmap = BitmapFactory.decodeResource(context.getResources(), bitmapResId);
    }

    /**
     * Is animation currently happening?
     * @return true if the token is currently moving (i.e. has a non-zero velocity); false otherwise.
     */
    public boolean isMoving() {
        return (velocity.x != 0 || velocity.y != 0);
    }

    /**
     * Creates a new chip.
     *
     * @param color       The color of the chip.
     * @param isPowerChip Indicates whether the chip is a power chip.
     * @return The created chip.
     */
    public static Chip createChip(Team color, boolean isPowerChip) {
        return new Chip(color, isPowerChip);
    }

    /**
     * Gets the current cell of the chip.
     *
     * @return The current cell.
     */
    public Cell getCurrentCell() {
        return currentCell;
    }

    /**
     * Checks whether a given cell is the same cell that the chip resides in
     * @param c the cell to test
     * @return true if the given cell is this chip's current cell, false otherwise
     */
    public boolean areYouHere(Cell c) {
        return (currentCell == c);
    }

    /**
     * Checks if the chip is selected.
     *
     * @return True if the chip is selected, false otherwise.
     */
    public boolean isSelected() {
        return selected;
    }

    /**
     * Sets the selection status of the chip.
     *
     * @param isSelected True to select the chip, false to deselect it.
     */
    public void setSelected(boolean isSelected) {
        this.selected = isSelected;
    }

    /**
     * Checks if the chip contains a specific point (x, y).
     *
     * @param x The x-coordinate of the point.
     * @param y The y-coordinate of the point.
     * @return True if the point is inside the chip, false otherwise.
     */
    public boolean contains(float x, float y) {
        return currentPosition.contains(x,y);
    }

    /**
     * Gets the color of the chip.
     *
     * @return The chip's color.
     */
    public Team getColor() {
        return color;
    }

    /**
     * Checks if the chip is a power chip.
     *
     * @return True if the chip is a power chip, false otherwise.
     */
    public boolean isPowerChip() {
        return isPowerChip;
    }

    /**
     * Draws the chip on the canvas.
     *
     * @param canvas The canvas on which to draw the chip.
     */
    public void draw(Canvas canvas) {
        if (currentCell != null) {
            float chipX = currentPosition.centerX();
            float chipY = currentPosition.centerY();
            float width = currentPosition.width();
            float height = currentPosition.height();

            if (chipBitmap != null) {
                // Draw the chip using the bitmap
                canvas.drawBitmap(chipBitmap, null, currentPosition, null);
            } else {
                // Draw the chip using circles
                Paint chipPaint = (color == Team.DARK) ? darkChipPaint : lightChipPaint;

                Paint outlinePaint = new Paint();
                outlinePaint.setStyle(Paint.Style.STROKE);
                outlinePaint.setStrokeWidth(30);
                outlinePaint.setColor(theme.getBorderColor());

                if (selected) {
                    Paint halo = new Paint();
                    halo.setStrokeWidth(35);
                    halo.setColor(Color.WHITE);
                    canvas.drawCircle(chipX, chipY, width * 0.6f, halo);
                }

                canvas.drawCircle(chipX, chipY, width * 0.45f, outlinePaint);
                canvas.drawCircle(chipX, chipY, width * 0.45f, chipPaint);

                if (isPowerChip) {
                    canvas.drawCircle(chipX, chipY, width * 0.2f, powerChipPaint);
                }
            }
        }
    }

    /**
     * Assign this chip to a particular cell
     * @param c the cell that this chip will reside in
     */
    public void setCell(Cell c) {
        if (currentCell != null) {
            currentCell.setOccupied(false);
        }
        currentCell = c;
        currentCell.setOccupied(true);
        velocity.set(0,0);
        currentPosition.set(currentCell.bounds());
    }

    /**
     * Sets the destination cell for the chip's movement and initiates the animation process.
     * When called, this method sets the destination cell, updates the current cell to null (indicating
     * that the chip has left its previous cell), sets the chip on the new destination cell, calculates
     * the velocity based on the direction to the destination, and adjusts the velocity based on the
     * desired step size (e.g., cellSize/3). This method is responsible for initializing the chip's
     * movement towards the destination.
     *
     * @param destination The cell where the chip is moving to.
     */
    public void setDestination(Cell destination) {
        this.destination = destination;

        if (destination != null) {
            float deltaX = destination.getLogicalX() - currentCell.getLogicalX();
            float deltaY = destination.getLogicalY() - currentCell.getLogicalY();

            // Set velocity based on the direction to the destination
            velocity.x = Math.signum(deltaX);
            velocity.y = Math.signum(deltaY);

            // Adjust velocity based on the desired step size (e.g., cellSize/3)
            velocity.x *= currentPosition.width() / 3f;
            velocity.y *= currentPosition.height() / 3f;
        }
    }

    /**
     * Animates the chip's movement towards its destination.
     * When called, this method calculates the movement delta based on the chip's velocity, updates
     * the current position accordingly, and checks if the chip has reached its destination. If the
     * chip is at its destination, it sets the position to the center of the destination cell.
     */
    public boolean animate() {
        boolean justFinished = false;
        if (velocity.x != 0 || velocity.y != 0) {
            float dx = destination.bounds().left - currentPosition.left;
            float dy = destination.bounds().top - currentPosition.top;
            if (PointF.length(dx, dy) < currentPosition.width() / 2) {
                setCell(destination);
                justFinished = true;
            }
            currentPosition.offset(velocity.x, velocity.y);
        }
        return justFinished;
    }


    public List<Cell> findPossibleMoves(Cell[][] cellz) {
        List<Cell> legalMoves = new ArrayList<>();
        int newX, newY;
        // final Cell currentCell = selected.getHostCell();
        if (isPowerChip) {
            // can we go right?
            for (newX = currentCell.getLogicalX() + 1; newX < 9; newX++) {
                Cell candidate = cellz[newX][currentCell.getLogicalY()];
                if (candidate.isLegalMove(this)) {
                    legalMoves.add(candidate);
                } else {
                    break;
                }
            }
            // can we go left?
            for (newX = currentCell.getLogicalX() - 1; newX >= 0; newX--) {
                Cell candidate = cellz[newX][currentCell.getLogicalY()];
                if (candidate.isLegalMove(this)) {
                    legalMoves.add(candidate);
                } else {
                    break;
                }
            }
            // can we go up?
            for (newY = currentCell.getLogicalY() - 1; newY >= 0; newY--) {
                Cell candidate = cellz[currentCell.getLogicalX()][newY];
                if (candidate.isLegalMove(this)) {
                    legalMoves.add(candidate);
                } else {
                    break;
                }
            }
            // can we go down?
            for (newY = currentCell.getLogicalY() + 1; newY < 10; newY++) {
                Cell candidate = cellz[currentCell.getLogicalX()][newY];
                if (candidate.isLegalMove(this)) {
                    legalMoves.add(candidate);
                } else {
                    break;
                }
            }
            // can we go up/right diagonal?
            newX = currentCell.getLogicalX() + 1;
            newY = currentCell.getLogicalY() - 1;
            while (newX < 9 && newY >= 0) {
                Cell candidate = cellz[newX][newY];
                if (candidate.isLegalMove(this)) {
                    legalMoves.add(candidate);
                    newX++;
                    newY--;
                } else {
                    break;
                }
            }
            // can we go up/left diagonal?
            newX = currentCell.getLogicalX() - 1;
            newY = currentCell.getLogicalY() - 1;
            while (newX >= 0 && newY >= 0) {
                Cell candidate = cellz[newX][newY];
                if (candidate.isLegalMove(this)) {
                    legalMoves.add(candidate);
                    newX--;
                    newY--;
                } else {
                    break;
                }
            }
            // can we go down/right diagonal?
            newX = currentCell.getLogicalX() + 1;
            newY = currentCell.getLogicalY() + 1;
            while (newX < 9 && newY < 10) {
                Cell candidate = cellz[newX][newY];
                if (candidate.isLegalMove(this)) {
                    legalMoves.add(candidate);
                    newX++;
                    newY++;
                } else {
                    break;
                }
            }
            // can we go down/left diagonal?
            newX = currentCell.getLogicalX() - 1;
            newY = currentCell.getLogicalY() + 1;
            while (newX >= 0 && newY < 10) {
                Cell candidate = cellz[newX][newY];
                if (candidate.isLegalMove(this)) {
                    legalMoves.add(candidate);
                    newX--;
                    newY++;
                } else {
                    break;
                }
            }

            // REGULAR CHIPS (not power chips)
        } else {
            // can we go right?
            Cell vettedCandidate = null;
            for (newX = currentCell.getLogicalX() + 1; newX < 9; newX++) {
                Cell candidate = cellz[newX][currentCell.getLogicalY()];
                if (candidate.isLegalMove(this)) {
                    vettedCandidate = candidate;
                } else {
                    break;
                }
            }
            if (vettedCandidate != null) {
                legalMoves.add(vettedCandidate);
            }
            // can we go left?
            vettedCandidate = null;
            for (newX = currentCell.getLogicalX() - 1; newX >= 0; newX--) {
                Cell candidate = cellz[newX][currentCell.getLogicalY()];
                if (candidate.isLegalMove(this)) {
                    vettedCandidate = candidate;
                } else {
                    break;
                }
            }
            if (vettedCandidate != null) {
                legalMoves.add(vettedCandidate);
            }

            // can we go up?
            vettedCandidate = null;
            for (newY = currentCell.getLogicalY() - 1; newY >= 0; newY--) {
                Cell candidate = cellz[currentCell.getLogicalX()][newY];
                if (candidate.isLegalMove(this)) {
                    vettedCandidate = candidate;
                } else {
                    break;
                }
            }
            if (vettedCandidate != null) {
                legalMoves.add(vettedCandidate);
            }

            // can we go down?
            vettedCandidate = null;
            for (newY = currentCell.getLogicalY() + 1; newY < 10; newY++) {
                Cell candidate = cellz[currentCell.getLogicalX()][newY];
                if (candidate.isLegalMove(this)) {
                    vettedCandidate = candidate;
                } else {
                    break;
                }
            }
            if (vettedCandidate != null) {
                legalMoves.add(vettedCandidate);
            }
        }
        return legalMoves;
    }
}

