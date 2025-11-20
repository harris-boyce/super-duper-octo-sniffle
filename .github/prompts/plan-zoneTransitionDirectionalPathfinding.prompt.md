Plan: Zone + Transition Tagged Directional Pathfinding

Goal
Introduce per-cell zone and transition metadata plus directional entry/exit flags to unify open-ground and constrained movement, ensure legal seat/corridor/stair traversal, eliminate post-path rejection loops, and support external JSON-driven stadium layouts.

Zone Types
- ground: Open movement, optional diagonals
- corridor: Above/around seating footprint (Manhattan only)
- seat: Row interior + seat footprint (Manhattan only, higher cost)
- rowEntry: Boundary cell permitting corridor/ground <-> seat transitions
- stair: Vertical traversal cells (special cost)
- sky: Non-navigable filler outside stadium footprint

Transition Types (optional tag on a cell)
- rowBoundary: Legal ingress/egress between seat and non-seat zones
- stairLanding: Stair <-> corridor linkage cell
- corridorEntry: Ground <-> corridor linkage cell (optional if adjacency alone suffices)

Directional Metadata
- allowedIncoming: Record<top|right|bottom|left, boolean>
- allowedOutgoing: Record<top|right|bottom|left, boolean>
Default true unless constrained (e.g., seat interiors block lateral incoming except from rowEntry).
Walls remain hard blockers independent of directional flags.

JSON Configuration (Option A: Flat List)
CellDescriptor schema:
{ row, col, zoneType, transitionType?, allowedIncoming?, allowedOutgoing?, passable? }
Unspecified directional flags default to true; passable default derives from zoneType (sky false, others true unless overridden).

GridManager Changes
1. Extend internal GridCell with zoneType, transitionType?, allowedIncoming, allowedOutgoing.
2. Add loadZoneConfig(data: CellDescriptor[]): validates bounds, applies metadata, builds caches.
3. Build boundary caches: rowEntryCells, stairLandingCells, corridorEntryCells.
4. Expose helpers: getZoneType(row,col), isTransition(row,col,type), getBoundarySet(type), isPassableDirection(fromRow,fromCol,toRow,toCol).
5. isPassableDirection logic:
   - Bounds & passable checks
   - Determine direction (from -> to)
   - walls[from][dir] == false && walls[to][opp] == false
   - allowedOutgoing[from][dir] && allowedIncoming[to][dir]
   - Zone / transition rules:
     * seat -> corridor/ground only via rowBoundary (from or intermediate rowEntry)
     * corridor/ground -> seat only if neighbor zone is rowEntry or transitionType=rowBoundary
     * stair access only via stairLanding cell
     * Diagonal allowed only when both zones ground

GridPathfinder Changes
1. Add directionalCache Map<"r1,c1->r2,c2", boolean>.
2. Subscribe to gridChanged and zonesLoaded: clear passableCache + directionalCache.
3. Refactor neighbor generation in astar():
   - Candidate directions: 4-way; if current zoneType ground and vendor allows diagonal, include 4 diagonals.
   - For each candidate, call gridManager.isPassableDirection. Skip rejected immediately.
4. Movement cost incorporates zone modifiers (gameBalance.vendorMovement.zoneCosts).
5. Heuristic: Manhattan for constrained zones; optionally Manhattan for ground for visual consistency. Add small transitionCrossPenalty per boundary crossing.
6. After path reconstruction: dev assertion that each step is axis-aligned unless both cells zoneType ground and diagonal permitted.

HybridPathResolver Alignment
1. Remove internal diagonal ground edges and skip links.
2. For node-to-node expansions use GridPathfinder.findPath between node grid coordinates.
3. If expansion fails due to blocked transition, select alternative boundary cell using boundary caches (choose minimal estimated total cost: entryCost + seatApproachCost).
4. Log fallback cases; if all fail, return empty path (AI may retry different target).

AIManager Integration
1. Initialize GridPathfinder after loading zones; ensure subscription active.
2. When choosing seat targets, optionally pre-filter seats whose nearest rowEntry boundary is not passable directionally.
3. On dynamic occupant changes rely on gridChanged events for cache invalidation.
4. Maintain axis-aligned interpolation; pathfinder already provides orthogonal steps.

GridOverlay Enhancements
1. Toggles: showZones, showTransitions, showDirectionalEdges.
2. Zone coloring: ground(green), corridor(blue), seat(gray), rowEntry(yellow), stair(orange), sky(transparent).
3. Transition glyphs: distinct marker per transitionType.
4. Directional edges: draw arrows on edges with allowedOutgoing; muted if incoming blocked.
5. Illegal step diagnostics: render red X and console warn if any path segment violates isPassableDirection (should never trigger).

Configuration (gameBalance additions)
- zoneCosts: { ground:0.7, corridor:0.8, seat:2.0, rowEntry:1.2, stair:stairTransitionCost }
- transitionCrossPenalty: small additive (e.g., 0.5 cell) to reduce oscillation
- groundDiagonalPenalty: multiplier (e.g., 1.15) keeping two orth moves cheaper
- maxIterations remains (2500) for safety

Testing Plan
Unit tests (__tests__/grid/):
1. zonesLoader.test: loads sample JSON; asserts zoneType and transition caches.
2. directionalPassability.test: verifies seat <-> corridor requires rowBoundary.
3. pathfindingManhattan.test: ensures no diagonals in non-ground zones.
4. boundarySelection.test: multiple rowEntry boundaries; choose minimal cost path.
5. cacheInvalidation.test: after wall change, directionalCache updates.
Integration test: vendor path to seat with single legal rowEntry (other blocked) uses that boundary; no illegal edges.

Migration Phases
Phase 1: Schema + loader (no path refactor yet).
Phase 2: Implement directional passability + A* neighbor filtering.
Phase 3: Delegate HybridPathResolver low-level expansion to GridPathfinder; prune legacy diagonal edges.
Phase 4: Overlay visualization + assertions + test suite.
Phase 5: Remove legacy getCellType inference if zoneType authoritative.
Phase 6: Performance tuning & parameter adjustments.

Performance / Risk Mitigation
- Directional & passable caches cleared only on structural changes.
- Unified zone-aware neighbor expansion prevents wasted retries.
- Hierarchical fallback minimized; alternate boundary chosen only on failure.
- Assertions catch divergence early in development builds.

Future Extensions
- Crowd density affects terrainPenalty dynamically.
- Multi-source precompute distances from all rowEntry cells for faster seat heuristics.
- Dynamic transition toggling (temporary closures) via transitionType state.

Acceptance Criteria
- Paths never violate directional or zone transition rules.
- Vendors never move diagonally outside ground zone.
- Seat entry always via rowEntry boundary cells.
- Cache invalidation works on gridChanged/zonesLoaded.
- Debug overlay clearly visualizes zones, transitions, and allowed directional edges.
