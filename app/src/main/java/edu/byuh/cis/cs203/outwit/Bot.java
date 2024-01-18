package edu.byuh.cis.cs203.outwit;

import android.util.Log;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

public class Bot {
    private Team color;
    private ArrayList<Chip> chipArrayList;
    private int numTurns;

    /**
     * Initialize the AI
     *
     * @param team  which team the AI plays for
     * @param chips all the chips on the game board (the AI will only consider its
     *              own chips)
     */
    public Bot(Team team, ArrayList<Chip> chips) {
        numTurns = 0;
        color = team;
        chipArrayList = chips.stream().filter(c -> c.getColor() == color).collect(Collectors.toCollection(ArrayList::new));
    }

    private boolean areAllChipsInHomeCornerExceptPowerChip(ArrayList<Chip> chips, Cell homeCorner, Chip powerChip) {
        for (Chip chip : chips) {
            if (chip != powerChip && !chip.getCurrentCell().equals(homeCorner)) {
                return false;
            }
        }
        return true;
    }

    /**
     * Collect all possible moves that any chip in my team can make.
     * For each move, measure the manhattan distance from the move
     * to the corner. choose the move with the smallest positive distance.
     * But for the first 3 moves, just move randomly.
     *
     * @param cellz a 2D array of all the cells on the gameboard
     * @return a Move object that encapsulates the move chosen by the AI
     */
    public Move getMove(Cell[][] cellz) {
        final Cell lightCorner = cellz[8][0];
        final Cell darkCorner = cellz[0][9];
        numTurns++;
        List<Move> allMoves = new ArrayList<>();
        List<Move> candidateMoves = new ArrayList<>();

        for (Chip eachChip : chipArrayList) {
            List<Cell> possibleMoves = eachChip.findPossibleMoves(cellz);
            possibleMoves.forEach(dest -> {
                Move mv = new Move(eachChip.getCurrentCell(), dest);

                // Check if the current chip is a PowerChip
                int cellWeight;
                if (eachChip.getCurrentCell().getColor() == Team.NEUTRAL) {
                    cellWeight = 2;
                } else {
                    cellWeight = 0;
                }
                if (eachChip.isPowerChip()) {
                    // Assuming PowerChip has a getWeight() method
                    int powerChipWeight = 0;
                    mv.setWeight(powerChipWeight + cellWeight);
                } else {
                    int powerChipWeight = 1;
                    mv.setWeight(powerChipWeight + cellWeight);
                }

                allMoves.add(mv);
            });
        }

        Move mustDoMove = null;
        for (Move mv : allMoves) {
            int distanceFromOriginToCorner;
            int distanceFromDestinationToCorner;
            if (color == Team.DARK) {
                distanceFromDestinationToCorner = mv.getDestination().manhattanDistance(darkCorner);
                distanceFromOriginToCorner = mv.getSource().manhattanDistance(darkCorner);
            } else {
                distanceFromDestinationToCorner = mv.getDestination().manhattanDistance(lightCorner);
                distanceFromOriginToCorner = mv.getSource().manhattanDistance(lightCorner);
            }
            // for now, only consider moves that get us closer to home
            if (distanceFromDestinationToCorner < distanceFromOriginToCorner) {
                mv.setDistance(distanceFromDestinationToCorner);
                candidateMoves.add(mv);
            }
            if (mv.getSource().getLogicalX() == 6 && mv.getSource().getLogicalY() == 0 || mv.getSource().getLogicalX() == 8 && mv.getSource().getLogicalY() == 2) {
                mustDoMove = mv;
                Log.d("","Must do move!");
            }
        }


        int count = 0;
        for (int i=6; i < 9; i++) {
            for (int j=0; j < 3; j++) {
                if (cellz[i][j].isOccupied()) {
                    count++;
                }
            }
        }

        Move mustDoMove2 = null;
        List<Move> allnMoves = new ArrayList<>();
        Chip lastChip = null;
        for (Chip c: chipArrayList) {
            if (c.getCurrentCell().getColor() != color) {
                List<Cell> possibleMoves = c.findPossibleMoves(cellz);
                possibleMoves.forEach(dest -> {
                    Move mov = new Move(c.getCurrentCell(), dest);
                    allnMoves.add(mov);
                });
                lastChip = c;
            }
        }
        // Endgame
        Log.d("","Count: " + count);

        if (count > 7) {
            for (int i=6; i < 9; i++) {
                for (int j=0; j < 3; j++) {
                    Cell emptyCell = cellz[i][j];
                    if (!emptyCell.isOccupied()) {
                        if (emptyCell.getLogicalY() == 2) {

                            if (lastChip != null) {
                                // Prioritize going down
                                if (lastChip.getCurrentCell().getLogicalY() < emptyCell.getLogicalY()) {
                                    for (Move m: allnMoves) {
                                        if (m.getDestination().getLogicalY() > emptyCell.getLogicalY()) {
                                            mustDoMove2 = m;
                                        }
                                    }
                                } else { // Prioritize going right
                                    for (Move m: allnMoves) {
                                        if (m.getDestination().getLogicalX() >= emptyCell.getLogicalX()) {
                                            mustDoMove2 = m;
                                        }
                                    }
                                }
                                if (lastChip.getCurrentCell().getLogicalX() == emptyCell.getLogicalX()) {
                                    for (Move m: allnMoves) {
                                        if (m.getDestination().getLogicalY() > lastChip.getCurrentCell().getLogicalY() && m.getDestination().getLogicalX() == lastChip.getCurrentCell().getLogicalX()) {
                                            mustDoMove2 = m;
                                        }
                                    }
                                }
                            }

                        } else{

                            if (lastChip != null) {
                                // Prioritize going left
                                if (lastChip.getCurrentCell().getLogicalX() > emptyCell.getLogicalX()) {
                                    for (Move m: allnMoves) {
                                        if (m.getDestination().getLogicalX() < emptyCell.getLogicalX()) {
                                            mustDoMove2 = m;
                                        }
                                    }
                                } else { // Prioritize going up
                                    for (Move m: allnMoves) {
                                        if (m.getDestination().getLogicalY() <= emptyCell.getLogicalY()) {
                                            mustDoMove2 = m;
                                        }
                                    }
                                }
                                if (lastChip.getCurrentCell().getLogicalY() == emptyCell.getLogicalY()) {
                                    for (Move m: allnMoves) {
                                        if (m.getDestination().getLogicalX() > lastChip.getCurrentCell().getLogicalX() && m.getDestination().getLogicalY() == lastChip.getCurrentCell().getLogicalY()) {
                                            mustDoMove2 = m;
                                        }
                                    }
                                }
                            }
                        }


//                        for (Chip c: chipArrayList) {
//                            if (c.getCurrentCell().getColor() != color) {
////                                int dist = c.getCurrentCell().manhattanDistance(emptyCell);
////                                Move mv = new Move(c.getCurrentCell(), emptyCell);
////                                mv.setDistance(dist);
////                                candidateMoves.add(mv);
//
//                                List<Cell> possibleMoves = c.findPossibleMoves(cellz);
//                                possibleMoves.forEach(dest -> {
//                                    Move mov = new Move(c.getCurrentCell(), dest);
//                                    allnMoves.add(mov);
//                                });
//                                Log.d("","Size of possible moves" + allnMoves.size());
//                            }
//                        }
//                        mustDoMove2 = allnMoves.get(0);
//                        for (Move m: allnMoves) {
//                            int distanceFromDestinationToCorner = m.getDestination().manhattanDistance(emptyCell);
//                            m.setDistance(distanceFromDestinationToCorner);
//                            // Check if the current move has a lower distance
//                            if (distanceFromDestinationToCorner < mustDoMove2.getDistance()) {
////                                mustDoMove2 = m;
////                                Log.d("","Empt cell is at " +emptyCell.getLogicalX() + "x " + emptyCell.getLogicalY() + "y");
//                            }
//
//
//                        }
                    }
                }
            }
        }
//        if (emptycell != null) {
//            int distanceFromOriginToCorner;
//            int distanceFromDestinationToCorner;
//            distanceFromDestinationToCorner = mv.getDestination().manhattanDistance(lightCorner);
//            distanceFromOriginToCorner = mv.getSource().manhattanDistance(lightCorner);
//        }

        if (numTurns < 4 || candidateMoves.isEmpty()) {
            // submit a random move
            Collections.shuffle(allMoves);
            if (!allMoves.isEmpty()) {
                while (allMoves.get(0).getDestination().getColor() != Team.NEUTRAL) {
                    Collections.shuffle(allMoves);
                }
            }
            return allMoves.get(0);
        } else if (mustDoMove != null) {
            return mustDoMove;
        } else if (mustDoMove2 != null) {
            return mustDoMove2;
        } else {
            Collections.sort(candidateMoves);
            return candidateMoves.get(0);
        }

    }

    public void decrement() {
        numTurns--;
    }
}
