/**
 * The Gameview class represents a custom View in the Outwit Android application.
 * It is responsible for drawing a grid of colored squares on the screen.
 */
package edu.byuh.cis.cs203.outwit.views;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Context;
import android.content.DialogInterface;
import android.content.res.Resources;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.Rect;
import android.graphics.RectF;
import android.media.MediaPlayer;
import android.util.Log;
import android.view.MotionEvent;
import android.view.View;

import java.util.ArrayList;
import java.util.Random;
import java.util.Stack;

import android.os.Handler;
import android.os.Message;
import android.widget.Toast;

import androidx.preference.PreferenceManager;

import java.util.function.Consumer;

import edu.byuh.cis.cs203.outwit.Bot;
import edu.byuh.cis.cs203.outwit.Cell;
import edu.byuh.cis.cs203.outwit.Chip;
import edu.byuh.cis.cs203.outwit.Move;
import edu.byuh.cis.cs203.outwit.R;
import edu.byuh.cis.cs203.outwit.Team;
import edu.byuh.cis.cs203.outwit.activities.Preferences;
import edu.byuh.cis.cs203.outwit.themes.Theme;


/**
 * The Gameview class represents a custom View in the Outwit Android application.
 * It is responsible for drawing a grid of colored squares on the screen.
 */
public class Gameview extends View {

    private Theme currentTheme;
    private long startTime;
    private long elapsedTime;

    private MediaPlayer moveSound;
    private boolean initialized = false;
    private Paint black;
    private Paint blue;
    private Paint lightBlue;
    private Paint darkBlue;
    private ArrayList<Chip> chipArrayList;
    private ArrayList<Cell> legalMoves;
    private Cell[][] cellArray;

    // Constants for grid size
    private static final int NUM_ROWS = 11;
    private static final int NUM_COLS = 9;
    private static final float GAP_SIZE_RATIO = 0.01f;
    private static final float TEXT_SIZE_RATIO = 0.08f;
    private static int ANIMATION_DELAY_MS;
    private AnimationHandler animationHandler;
    private Cell cellDestination;
    private Chip selectedChip;
    private Cell secondToCellDestination;
    private Chip secondToSelectedChip;
    private Rect imageBounds;
    private Stack<Move> undoStack;
    private Team currentPlayer;
    private Team computerPlayer;
    private boolean stopGame = false;
    private Consumer<Chip> chipSelectionAction = (selectedChip) -> {
        // Implement the action to be taken when a chip is selected
        // For example, you can call a method to handle chip selection
        selectChip(selectedChip);
    };
    private Bot ai;


    /**
     * Constructor for the Gameview class.
     *
     * @param context The context in which this view is created.
     */
    public Gameview(Context context) {
        super(context);
        currentTheme = Preferences.getThemePref(context);
        initPaints();
        setBackgroundColor(currentTheme.getBorderColor());
        chipArrayList = new ArrayList<>();
        legalMoves = new ArrayList<>();
        cellArray = new Cell[NUM_COLS][NUM_ROWS];
        // Create the animationHandler and start the animation loop
        animationHandler = new AnimationHandler();
        // Create stack of moves
        undoStack = new Stack<>();
        currentPlayer = Preferences.getPlayerPref(context);
        ANIMATION_DELAY_MS = Preferences.getSpeedPref(context);
        moveSound = MediaPlayer.create(context, R.raw.capture); // Load your sound file here
        moveSound.setLooping(false);
        // Initialize the start time
        startTime = System.currentTimeMillis();
        computerPlayer = Preferences.whosePlayingPref(context);
    }

    /**
     * The AnimationHandler class is responsible for handling animation events in the Gameview class.
     * It extends the Handler class and is used to schedule and control animations for chips on the game board.
     */
    private class AnimationHandler extends Handler {

        private boolean paused;

        /**
         * Start the timer
         */
        public void resume() {
            paused = false;
            sendMessageDelayed(obtainMessage(), 10);
        }

        /**
         * pause the timer
         */
        public void pause() {
            paused = true;
            removeCallbacksAndMessages(null);
        }

        /**
         * Constructs an AnimationHandler object and schedules the first animation event.
         */
        public AnimationHandler() {
            resume();
        }

        /**
         * Handles animation messages by updating the chip's position and refreshing the display.
         * If a cell destination is set, it moves the selected chip towards the destination using the
         * `animate` method. It then invalidates the view to trigger a redraw, and schedules the next
         * animation event after a delay.
         *
         * @param msg The message to handle.
         */
        @Override
        public void handleMessage(Message msg) {
            boolean animationFinished = false;
            if (cellDestination != null) {
                selectedChip.setDestination(cellDestination);
                animationFinished = selectedChip.animate();

                if (animationFinished) {
                    checkForWinner(); // Check for a winner when the animation finishes
                }
            }
            boolean secondAnimationFinished = false;
            if (secondToCellDestination != null) {
                secondToSelectedChip.setDestination(secondToCellDestination);
                secondAnimationFinished = secondToSelectedChip.animate();

                if (secondAnimationFinished) {
                    checkForWinner(); // Check for a winner when the animation finishes
                }
            }

            if (animationFinished && currentPlayer == computerPlayer) {
                makeAiMove();
            }

            invalidate(); // Refresh the display

            if (!paused) {
                // Schedule the next animation event
                sendMessageDelayed(obtainMessage(), ANIMATION_DELAY_MS);
            }
        }
    }


    /**
     * Initializes Paint objects for various colors used in drawing.
     * This method creates Paint objects for black, blue, light blue,
     * and dark blue colors to be used in the drawing operations.
     */
    private void initPaints() {
        // Access the colors from resources
        black = createPaint(currentTheme.getBorderColor());
        blue = createPaint(currentTheme.getNeutralCellColor());
        lightBlue = createPaint(currentTheme.getLightCellColor());
        darkBlue = createPaint(currentTheme.getDarkCellColor());

        black.setTextSize(100);
    }


    /**
     * Create a Paint object with the given color.
     *
     * @param color The color code for the Paint object.
     * @return A Paint object with the specified color.
     */
    private Paint createPaint(int color) {
        Paint paint = new Paint();
        paint.setColor(color);
        return paint;
    }

    /**
     * This method is called to draw the grid of colored squares on the canvas.
     *
     * @param canvas The Canvas object on which to draw the grid.
     */
    @Override
    public void onDraw(Canvas canvas) {
        int canvasWidth = canvas.getWidth();
        int canvasHeight = canvas.getHeight();
        float gapSize = Math.min(canvasWidth, canvasHeight) * GAP_SIZE_RATIO;
        // Calculate the text size based on screen dimensions
        float textSize = Math.min(canvasWidth, canvasHeight) * TEXT_SIZE_RATIO;

        float squareWidth = (canvasWidth - (NUM_COLS + 1) * gapSize) / NUM_COLS;
        float squareHeight = (canvasHeight - (NUM_ROWS + 1) * gapSize) / NUM_ROWS;

        float x = gapSize;
        float y = gapSize;

        if (!initialized) {
            // Loop through rows and columns to draw the grid of colored squares
            for (int i = 0; i < NUM_ROWS - 1; i++) {
                for (int j = 0; j < NUM_COLS; j++) {
                    cellArray[j][i] = new Cell(j, i, determineTeam(j, i), canvasWidth/9f, canvasHeight/11f);
                    x += (squareWidth + gapSize);
                }
                x = gapSize;
                y += (squareHeight + gapSize);
            }

            for (int i = 0, j = 0; i < NUM_COLS; i++, j++) {
                createAndAddChips(j, i);
            }
            ai = new Bot(computerPlayer, chipArrayList);
            if (currentPlayer == computerPlayer) {
                makeAiMove();
            }
            initialized = true;
        }


        // Loop through rows and columns to draw the grid of colored squares
        for (int i = 0; i < NUM_ROWS - 1; i++) {
            for (int j = 0; j < NUM_COLS; j++) {
                RectF rectangle = new RectF(x, y, x + squareWidth, y + squareHeight);
                Paint squarePaint = determineSquareColor(j, i);
                canvas.drawRect(rectangle, squarePaint);
                x += (squareWidth + gapSize);
            }
            x = gapSize;
            y += (squareHeight + gapSize);
        }

        for (Chip chip : chipArrayList) {
            chip.draw(canvas);
        }

        for (Cell cell : legalMoves) {
            cell.drawLegalMoveMarker(canvas);
        }

        // Calculate the position for the image row (last row)
        float imageRowY = y; // Last row
        float imageX = canvasWidth - (squareWidth * 2) - gapSize; // Adjust as needed

        // Draw a rectangle for the image row
        Paint imageRowRectanglePaint = createPaint(Color.WHITE); // Change color as needed
        RectF imageRowRect = new RectF(gapSize, imageRowY, canvasWidth - gapSize, imageRowY + squareHeight);
        canvas.drawRect(imageRowRect, imageRowRectanglePaint);

        // Draw your image in the image row (scaled to the size of a cell)
        Bitmap image = BitmapFactory.decodeResource(getResources(), R.drawable.undo);
        imageBounds = new Rect((int) imageX, (int) imageRowY, (int) (imageX + squareWidth * 2), (int) (imageRowY + squareHeight));
        canvas.drawBitmap(image, null, imageBounds, null);

        // Calculate the X-coordinate for the center of the canvas
        float centerX = (canvasWidth/2);

        // Calculate the Y-coordinate for the center of the last row
        float centerY = imageRowY + (squareHeight / 2);

        // Set the text size for the Paint object
        Paint textPaint = new Paint();
        textPaint.setTextSize(textSize);
        textPaint.setColor(Color.BLACK); // Set the text color

        // Calculate the X-coordinate for the start of the text to center it
        Resources resources = getResources();
        String playerName1 = PreferenceManager.getDefaultSharedPreferences(getContext())
                .getString( "dark", resources.getString(R.string.darks_turn));
        String playerName2 = PreferenceManager.getDefaultSharedPreferences(getContext())
                .getString( "light", resources.getString(R.string.lights_turn));
        String currentPlayerText = (currentPlayer == Team.LIGHT) ? playerName2 : playerName1;

        float textX = centerX - (textPaint.measureText(currentPlayerText) / 2);

        // Calculate the Y-coordinate for the text to center it vertically
        float textY = centerY + (textPaint.getFontMetrics().bottom - textPaint.getFontMetrics().top) / 2 - textPaint.getFontMetrics().bottom;

        if (Preferences.getTimerPref(getContext())){
            // Calculate elapsed time
            elapsedTime = System.currentTimeMillis() - startTime;

            // Calculate the X-coordinate for the start of the text to center it
            float timetextX =  canvasWidth/10;

            // Calculate the Y-coordinate for the text to center it vertically
            float timetextY = centerY + (textPaint.getFontMetrics().bottom - textPaint.getFontMetrics().top) / 2 - textPaint.getFontMetrics().bottom;

            // Display whose turn it is along with the timer
            canvas.drawText(currentPlayerText + " - " + formatTime(elapsedTime), timetextX, timetextY, textPaint);

        } else{
            // Display whose turn it is
            canvas.drawText(currentPlayerText, textX, textY, textPaint);
        }
    }

    /**
     * Formats the elapsed time in milliseconds into a human-readable string in the format HH:MM:SS.
     *
     * @param millis The elapsed time in milliseconds.
     * @return A formatted string representing the elapsed time.
     */
    private String formatTime(long millis) {
        int seconds = (int) (millis / 1000) % 60;
        int minutes = (int) ((millis / (1000 * 60)) % 60);

        return String.format("%02d:%02d", minutes, seconds);
    }


    /**
     * Determine the color of the square based on its position.
     *
     * @param x The logical X-coordinate of the square.
     * @param y The logical Y-coordinate of the square.
     * @return The Paint object representing the color of the square.
     */
    private Paint determineSquareColor(int x, int y) {
        if (x > 5 && y < 3) {
            return lightBlue;
        } else if (x < 3 && y > 6) {
            return darkBlue;
        } else {
            return blue;
        }
    }

    /**
     * Determine the team for a cell based on its position.
     *
     * @param x The logical X-coordinate of the cell.
     * @param y The logical Y-coordinate of the cell.
     * @return The Team enumeration representing the team of the cell.
     */
    private Team determineTeam(int x, int y) {
        if (x > 5 && y < 3) {
            return Team.LIGHT;
        } else if (x < 3 && y > 6) {
            return Team.DARK;
        } else {
            return Team.NEUTRAL;
        }
    }

    /**
     * Create and add chips to the chipArrayList for a given position.
     *
     * @param x The logical X-coordinate of the chip.
     * @param y The logical Y-coordinate of the chip.
     */
    private void createAndAddChips(int x, int y) {
        String chipsetPref = Preferences.getChipsetPref(getContext());
        boolean isPowerchip;
        if (chipsetPref.equals("standard")) {
            isPowerchip = (x == 4 && y == 4);
        } else if (chipsetPref.equals("power")) {
            isPowerchip = true;
        } else {
            isPowerchip = false;
        }

        String chipLayout = Preferences.getChipLayoutPref(getContext());
        Chip.initializeStaticPaints(getContext());
        // Create dark chip and light chip
        Chip darkChip = Chip.createChip(Team.DARK, isPowerchip);
        Chip lightChip = Chip.createChip(Team.LIGHT, isPowerchip);
        // Add chips to the list
        chipArrayList.add(darkChip);
        chipArrayList.add(lightChip);

//        if (Preferences.getThemeChipResource(getContext())) {
//            darkChip.setChipBitmap(getContext(), R.drawable.darkchip);
//            lightChip.setChipBitmap(getContext(), R.drawable.lightchip);
//        }

        if (chipLayout.equals("standard")) {
            darkChip.setCell(cellArray[x][y]);
            lightChip.setCell(cellArray[x][y + 1]);
        } else {

            // Initialize random coordinates for the dark chip and the light chip
            int randomDarkX, randomDarkY, randomLightX, randomLightY;

            do {
                // Regenerate random coordinates for the dark chip
                randomDarkX = (int) (Math.random() * 8); // Replace gridWidth with the actual grid width
                randomDarkY = (int) (Math.random() * 9); // Replace gridHeight with the actual grid height
            } while (cellArray[randomDarkX][randomDarkY].isOccupied() || (randomDarkX > 5 && randomDarkY < 3) || (randomDarkX < 3 && randomDarkY > 6));

            do {
                // Regenerate random coordinates for the light chip
                randomLightX = (int) (Math.random() * 8);
                randomLightY = (int) (Math.random() * 9);
            } while ((randomLightX == randomDarkX && randomLightY == randomDarkY) || cellArray[randomLightX][randomLightY].isOccupied() || (randomLightX > 5 && randomLightY < 3) || (randomLightX < 3 && randomLightY > 6));

            // Set chips in their respective random cells
            darkChip.setCell(cellArray[randomDarkX][randomDarkY]);
            lightChip.setCell(cellArray[randomLightX][randomLightY]);
        }
    }




    /**
     * Handles touch events on the game board.
     *
     * @param event The MotionEvent representing the touch event.
     * @return True if the event was handled, false otherwise.
     */
    @Override
    public boolean onTouchEvent(MotionEvent event) {
        if (event.getAction() == MotionEvent.ACTION_DOWN) {

            //ignore touch events while a chip is moving
            if (anyMovingChips()) {
                return true;
            }

            if (isUndoImageClicked(event.getX(), event.getY())) {
                undoLastMove();
                invalidate(); // Redraw the screen
            } else {
                    handleChipTouch(event.getX(), event.getY());
                invalidate(); // Redraw the screen
            }
        }
        return true;
    }

    /**
     * Checks if the undo image was clicked.
     *
     * @param x The x-coordinate of the touch event.
     * @param y The y-coordinate of the touch event.
     * @return True if the undo image was clicked, false otherwise.
     */
    private boolean isUndoImageClicked(float x, float y) {
        return imageBounds.contains((int) x, (int) y);
    }

    /**
     * Stub for undoing the last move. Does nothing except print a message to LogCat.
     */
    public void undoLastMove() {
        // Step 1: Unselect the currently selected chip (if any)
        unselectChips();

        // Step 2: Clear the list of legal moves (if any)
        legalMoves.clear();

        // Step 3: Check if the undo stack is empty
        if (undoStack.isEmpty()) {
            // If it is, show a Toast message telling the user there are no moves to undo.
            Toast.makeText(getContext(), R.string.undo, Toast.LENGTH_SHORT).show();
        } else {
            // Step 4: Pop the top Move off the undo stack
            ai.decrement();
            Move lastMove = undoStack.pop();
            Cell current = lastMove.getDestination();
            Cell moveTo = lastMove.getSource();
            selectedChip = findChipAt(current);
            cellDestination = moveTo;
            currentPlayer = (currentPlayer == Team.LIGHT) ? Team.DARK : Team.LIGHT;

            if (Preferences.getHumanResource(getContext()) && undoStack.size() >= 2) {
                Move secondToLastMove = undoStack.pop();
                Cell secondToCurrent = secondToLastMove.getDestination();
                Cell secondToMoveTo = secondToLastMove.getSource();
                secondToSelectedChip = findChipAt(secondToCurrent);
                secondToCellDestination = secondToMoveTo;

                // Swap the current player
                currentPlayer = (currentPlayer == Team.LIGHT) ? Team.DARK : Team.LIGHT;
            }

            // Step 5: Limit the size of the undo stack
            limitUndoStackSize();
        }
    }

    /**
     * Limits the size of the undo stack by popping the oldest move when it exceeds a certain threshold.
     */
    private void limitUndoStackSize() {
        String undoLimit = Preferences.getUndoPref(getContext());
        if (!undoLimit.equals("none")){
            int maxStackSize = Integer.parseInt(undoLimit); // Set the maximum size of the undo stack as needed

            while (undoStack.size() > maxStackSize) {
                undoStack.remove(0); // Remove the oldest move
            }
        }
    }

    /**
     * Given a cell, find the chip that's on it.
     * @param cell the Cell we're investigating
     * @return the Chip currently sitting on that Cell, or null if the cell is vacant.
     */
    private Chip findChipAt(Cell cell) {
        for (Chip c : chipArrayList) {
            if (c.areYouHere(cell)) {
                return c;
            }
        }
        return null;
    }

    /**
     * Handles a touch event on the chips.
     *
     * @param x The x-coordinate of the touch event.
     * @param y The y-coordinate of the touch event.
     */
    private void handleChipTouch(float x, float y) {
        for (Cell c : legalMoves) {
            if (c.contains(x, y)) {
                cellDestination = c;
                Cell cellSource = selectedChip.getCurrentCell();

                // Create a Move object and push it onto the undoStack
                Move move = new Move(cellSource, cellDestination);
                undoStack.push(move);

                // Swap the current player
                currentPlayer = (currentPlayer == Team.LIGHT) ? Team.DARK : Team.LIGHT;

                if (Preferences.getSoundPref(getContext())) {
                    moveSound.start();
                }

                break;
            } else {
                cellDestination = null;
                secondToCellDestination = null;
            }
        }

        legalMoves.clear();

        boolean chipTapped = false;

        for (Chip chip : chipArrayList) {
            if (chip.contains(x, y) && chip.getColor() == currentPlayer) {
                selectedChip = chip;
                cellDestination = null;
                secondToCellDestination = null;
                if (!chip.isSelected()) {
                    chipSelectionAction.accept(chip); // Use the Consumer to handle chip selection
                    chipTapped = true;
                }
                break;
            }
        }

        if (!chipTapped) {
            unselectChips();
        }
    }

    /**
     * Makes a move for the AI player.
     * This method randomly selects a chip from the available chips,
     * then selects a legal move for the chip and updates the game state accordingly.
     */
    private void makeAiMove() {
        Move aiMove = ai.getMove(cellArray);
        undoStack.push(aiMove);
        Chip chipToMove = getChipAt(aiMove.getSource());
        selectedChip = chipToMove;
        cellDestination = aiMove.getDestination();
        // Swap the current player
        currentPlayer = (currentPlayer == Team.LIGHT) ? Team.DARK : Team.LIGHT;

        // Play move sound if sound preference is enabled
        if (Preferences.getSoundPref(getContext())) {
            moveSound.start();
        }

        // Clear the legalMoves list and reset chipTapped flag
        legalMoves.clear();
    }



    /**
     * Checks for a winner in the game by counting the number of chips in their respective home cells.
     * If one team reaches 9 chips in their home, a winner dialog is displayed.
     */
    private void checkForWinner() {
        int lightChipsInHome = 0; // Counter for light chips in their home
        int darkChipsInHome = 0;  // Counter for dark chips in their home

        // Iterate through all chips on the board
        for (Chip chip : chipArrayList) {
            Team chipColor = chip.getColor(); // Get the color of the current chip
            Team currentCellColor = chip.getCurrentCell().getColor(); // Get the color of the cell where the chip is

            // Check if the chip color and the cell color match for light team
            if (chipColor == Team.LIGHT && currentCellColor == Team.LIGHT) {
                lightChipsInHome++; // Increment the counter for light chips in home
            } else if (chipColor == Team.DARK && currentCellColor == Team.DARK) {
                darkChipsInHome++; // Increment the counter for dark chips in home
            }
        }

        // Check if the game should continue
        if (!stopGame) {
            // Check if the light team has reached 9 chips in their home
            if (lightChipsInHome == 9) {
                showWinnerDialog("Light"); // Display the winner dialog for the light team
            }
            // Check if the dark team has reached 9 chips in their home
            else if (darkChipsInHome == 9) {
                showWinnerDialog("Dark"); // Display the winner dialog for the dark team
            }
        }
    }

    /**
     * Displays a winner dialog with the name of the winning team.
     *
     * @param winner The name of the winning team (e.g., "Light" or "Dark").
     */
    private void showWinnerDialog(String winner) {
        animationHandler.pause();
        AlertDialog.Builder builder = new AlertDialog.Builder(getContext());
        builder.setTitle("Winner: " + winner)
                .setMessage(winner + " team won the game!")
                .setPositiveButton("Restart", new DialogInterface.OnClickListener() {
                    @Override
                    public void onClick(DialogInterface dialog, int which) {
                        chipArrayList.clear();
                        undoStack.clear();
                        currentPlayer = (Math.random() < 0.5) ? Team.LIGHT : Team.DARK;
                        stopGame = false; // Set stopGame to false here
                        initialized = false;
                        invalidate();
                        animationHandler.resume();
                    }
                })
                .setNegativeButton("Exit", (dialog, which) ->
                        ((Activity)getContext()).finish()
                )
                .setCancelable(false);

        AlertDialog dialog = builder.create();
        dialog.show();
    }



    /**
     * Selects a chip and deselects all other chips.
     *
     * @param selectedChip The chip to be selected.
     */
    private void selectChip(Chip selectedChip) {
        selectedChip.setSelected(true);
        for (Chip chip : chipArrayList) {
            if (chip != selectedChip) {
                chip.setSelected(false);
            }
        }

        Cell selectedCell = selectedChip.getCurrentCell();
        int logicalX = selectedCell.getLogicalX();
        int logicalY = selectedCell.getLogicalY();
        addLegalMovesInDirection(selectedChip, logicalX, logicalY, 1, 0); // Right
        addLegalMovesInDirection(selectedChip, logicalX, logicalY, -1, 0); // Left
        addLegalMovesInDirection(selectedChip, logicalX, logicalY, 0, 1); // Down
        addLegalMovesInDirection(selectedChip, logicalX, logicalY, 0, -1); // Up
        if (selectedChip.isPowerChip()) {
            // Handle power chip moves
            addLegalMovesInDirection(selectedChip, logicalX, logicalY, 1, -1); // Up-Right
            addLegalMovesInDirection(selectedChip, logicalX, logicalY, -1, -1); // Up-Left
            addLegalMovesInDirection(selectedChip, logicalX, logicalY, -1, 1); // Down-Left
            addLegalMovesInDirection(selectedChip, logicalX, logicalY, 1, 1); // Down-Right
        }
    }

    /**
     * Adds legal moves in a given direction.
     *
     * @param startX The starting logical X-coordinate.
     * @param startY The starting logical Y-coordinate.
     * @param deltaX The change in X-coordinate for each step.
     * @param deltaY The change in Y-coordinate for each step.
     */
    private void addLegalMovesInDirection(Chip selectedChip, int startX, int startY, int deltaX, int deltaY) {
        int x = startX + deltaX;
        int y = startY + deltaY;
        boolean isPowerChip = selectedChip.isPowerChip();
        Cell lastValidCandidate = null;

        while (isValidCell(x, y)) {
            Cell candidate = cellArray[x][y];
            if (candidate.isLegalMove(selectedChip)) {
                if (isPowerChip) {
                    legalMoves.add(candidate); // For power chips, add all valid candidates
                } else {
                    lastValidCandidate = candidate; // Store the last valid candidate for non-power chips
                }
            } else {
                break; // Stop checking in this direction for non-power chips
            }
            x += deltaX;
            y += deltaY;
        }

        if (!isPowerChip && lastValidCandidate != null) {
            legalMoves.add(lastValidCandidate); // Add the last valid candidate for non-power chips
        }
    }


    /**
     * Checks if the given coordinates represent a valid cell on the game board.
     *
     * @param x The logical X-coordinate.
     * @param y The logical Y-coordinate.
     * @return True if the coordinates are valid, false otherwise.
     */
    private boolean isValidCell(int x, int y) {
        return x >= 0 && x < NUM_COLS && y >= 0 && y < NUM_ROWS - 1;
    }

    /**
     * Unselects the previously-selected chip.
     */
    private void unselectChips() {
        for (Chip chip : chipArrayList) {
            if (chip.isSelected()) {
                chip.setSelected(false);
                break; // Only unselect one chip if multiple are selected
            }
        }
    }

    /**
     * checks if a chip is moving
     * @return true if a chip is currently moving; false otherwise.
     */
    private boolean anyMovingChips() {
        boolean result = false;
        for (Chip c : chipArrayList) {
            if (c.isMoving()) {
                result = true;
                break;
            }
        }
        return result;
    }

    public void resumeGame() {
        if (animationHandler != null) {
            animationHandler.resume();
        }
    }

    public void pauseGame() {
        if (animationHandler != null) {
            animationHandler.pause();
        }
    }

    private Chip getChipAt(Cell cel) {
        return chipArrayList.stream().filter(ch -> ch.areYouHere(cel)).findFirst().get();
    }
}
