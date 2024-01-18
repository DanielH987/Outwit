package edu.byuh.cis.cs203.outwit;

public class Move implements Comparable<Move> {
    private Cell source;
    private Cell destination;
    private int distance;
    private int weight;

    /**
     * Canonical constructor for the Move class.
     *
     * @param source      The source cell where the chip moves from.
     * @param destination The destination cell where the chip moves to.
     */
    public Move(Cell source, Cell destination) {
        this.source = source;
        this.destination = destination;
        this.distance = -1;
        this.weight = -1;

    }

    /**
     * Get the source cell of the move.
     *
     * @return The source cell.
     */
    public Cell getSource() {
        return source;
    }

    /**
     * Get the destination cell of the move.
     *
     * @return The destination cell.
     */
    public Cell getDestination() {
        return destination;
    }

    public void setDistance(int md) {
        distance = md;
    }

    public int getDistance() {
        return distance;
    }

    public void setWeight(int w) {
        weight = w;
    }

    @Override
    public int compareTo(Move other) {
        // First, compare by weight in descending order
        int weightComparison = other.weight - this.weight;

        // If weights are equal, compare by distance in ascending order
        if (weightComparison == 0) {
            return this.distance - other.distance;
        }

        return weightComparison;
    }


}
