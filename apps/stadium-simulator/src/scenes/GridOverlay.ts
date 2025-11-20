import Phaser from 'phaser';

import { gameBalance } from '@/config/gameBalance';
import { GridManager, CardinalDirection } from '@/managers/GridManager';
import type { AIManager } from '@/managers/AIManager';
import type { HybridPathResolver } from '@/managers/HybridPathResolver';

export class GridOverlay extends Phaser.GameObjects.Graphics {
  private readonly grid: GridManager;
  private readonly debugConfig = gameBalance.grid.debug;
  private needsRedraw: boolean = true;
  private readonly gridChangedHandler: () => void;
  private aiManager?: AIManager;
  private stadiumScene?: Phaser.Scene;
  public showNodes: boolean = false;
  public showVendorPaths: boolean = false;
  public showZones: boolean = false;
  public showTransitions: boolean = false;
  public showDirectionalEdges: boolean = false;
  private pulseAlpha: number = 0.5;
  private pulseDirection: number = 1;

  constructor(scene: Phaser.Scene, grid: GridManager) {
    super(scene);
    this.grid = grid;

    this.setDepth(this.debugConfig.depth);
    this.setScrollFactor(1);
    this.setVisible(this.debugConfig.initialVisible);

    this.gridChangedHandler = () => {
      this.needsRedraw = true;
    };

    this.grid.on('gridChanged', this.gridChangedHandler);
    this.scene.events.on(Phaser.Scenes.Events.UPDATE, this.handleSceneUpdate, this);

    scene.add.existing(this);
  }

  public setAIManager(aiManager: AIManager): void {
    this.aiManager = aiManager;
    
    // Subscribe to vendor path planning events
    aiManager.on('vendorPathPlanned', () => {
      if (this.showVendorPaths) {
        this.needsRedraw = true;
      }
    });
  }

  public setStadiumScene(stadiumScene: Phaser.Scene): void {
    this.stadiumScene = stadiumScene;
  }

  public setDebugVisible(visible: boolean): void {
    this.setVisible(visible);
    if (visible) {
      this.needsRedraw = true;
    } else {
      // Reset node and path visibility when grid disabled
      this.showNodes = false;
      this.showVendorPaths = false;
    }
    
    // Toggle background visibility
    this.setBackgroundVisible(!visible);
  }

  public toggleNodes(): void {
    if (!this.visible) return; // Only toggle if grid is visible
    this.showNodes = !this.showNodes;
    this.needsRedraw = true;
    console.log(`[GridOverlay] Navigation nodes: ${this.showNodes ? 'ON' : 'OFF'}`);
  }

  public toggleVendorPaths(): void {
    if (!this.visible) return; // Only toggle if grid is visible
    this.showVendorPaths = !this.showVendorPaths;
    this.needsRedraw = true;
    console.log(`[GridOverlay] Vendor paths: ${this.showVendorPaths ? 'ON' : 'OFF'}`);
  }

  public toggleZones(): void {
    if (!this.visible) return;
    this.showZones = !this.showZones;
    this.needsRedraw = true;
    console.log(`[GridOverlay] Zone visualization: ${this.showZones ? 'ON' : 'OFF'}`);
  }

  public toggleTransitions(): void {
    if (!this.visible) return;
    this.showTransitions = !this.showTransitions;
    this.needsRedraw = true;
    console.log(`[GridOverlay] Transition markers: ${this.showTransitions ? 'ON' : 'OFF'}`);
  }

  public toggleDirectionalEdges(): void {
    if (!this.visible) return;
    this.showDirectionalEdges = !this.showDirectionalEdges;
    this.needsRedraw = true;
    console.log(`[GridOverlay] Directional edges: ${this.showDirectionalEdges ? 'ON' : 'OFF'}`);
  }

  private setBackgroundVisible(visible: boolean): void {
    if (!this.stadiumScene) return;
    
    // Call method on stadium scene to set background alpha
    const setAlpha = (this.stadiumScene as any).setBackgroundAlpha;
    if (typeof setAlpha === 'function') {
      setAlpha.call(this.stadiumScene, visible ? 1 : 0);
    }
  }

  public refresh(): void {
    this.needsRedraw = true;
  }

  public destroy(fromScene?: boolean): void {
    this.grid.off('gridChanged', this.gridChangedHandler);
    this.scene.events.off(Phaser.Scenes.Events.UPDATE, this.handleSceneUpdate, this);
    super.destroy(fromScene);
  }

  private handleSceneUpdate(): void {
    if (!this.visible) return;
    
    // Update pulse animation for active vendor segment highlighting
    this.pulseAlpha += this.pulseDirection * 0.02;
    if (this.pulseAlpha >= 1.0) {
      this.pulseAlpha = 1.0;
      this.pulseDirection = -1;
    } else if (this.pulseAlpha <= 0.5) {
      this.pulseAlpha = 0.5;
      this.pulseDirection = 1;
    }
    
    if (!this.needsRedraw) return;

    this.redraw();
    this.needsRedraw = false;
  }

  private redraw(): void {
    const { gridColor, gridAlpha, gridLineWidth, wallColor, wallAlpha, wallLineWidth } = this.debugConfig;
    const rows = this.grid.getRowCount();
    const cols = this.grid.getColumnCount();
    const { cellSize } = this.grid.getWorldSize();
    const origin = this.grid.getOrigin();

    console.log(`[GridOverlay.redraw] Clearing and redrawing. Visible: ${this.visible}, Depth: ${this.depth}, Alpha: ${this.alpha}`);

    this.clear();

    // Render zone background tints if enabled (drawn first, under grid lines)
    if (this.showZones) {
      this.renderZones(cellSize);
    }

    this.lineStyle(gridLineWidth, gridColor, gridAlpha);
    this.drawGridLines(rows, cols, cellSize, origin.x, origin.y);

    this.lineStyle(wallLineWidth, wallColor, wallAlpha);
    this.drawWalls(cellSize);

    // Render transition markers if enabled
    if (this.showTransitions) {
      this.renderTransitions(cellSize);
    }

    // Render directional edges if enabled
    if (this.showDirectionalEdges) {
      this.renderDirectionalEdges(cellSize);
    }

    // Render navigation nodes and edges if enabled
    if (this.showNodes) {
      console.log('[GridOverlay.redraw] Rendering navigation nodes...');
      this.renderNavigationNodes();
    }

    // Render vendor paths if enabled
    if (this.showVendorPaths) {
      console.log('[GridOverlay.redraw] Rendering vendor paths...');
      this.renderVendorPaths();
    }
    
    console.log('[GridOverlay.redraw] Redraw complete');
  }

  private drawGridLines(rows: number, cols: number, cellSize: number, originX: number, originY: number): void {
    for (let col = 0; col <= cols; col++) {
      const x = originX + col * cellSize;
      this.drawLine(x, originY, x, originY + rows * cellSize);
    }

    for (let row = 0; row <= rows; row++) {
      const y = originY + row * cellSize;
      this.drawLine(originX, y, originX + cols * cellSize, y);
    }
  }

  private drawWalls(cellSize: number): void {
    const cells = this.grid.getAllCells();

    cells.forEach((cell) => {
      const bounds = this.grid.getCellBounds(cell.row, cell.col);

      const startX = bounds.x;
      const startY = bounds.y;
      const endX = bounds.x + cellSize;
      const endY = bounds.y + cellSize;

      this.drawWallSegment(cell, 'top', startX, startY, endX, startY);
      this.drawWallSegment(cell, 'right', endX, startY, endX, endY);
      this.drawWallSegment(cell, 'bottom', startX, endY, endX, endY);
      this.drawWallSegment(cell, 'left', startX, startY, startX, endY);
    });
  }

  private drawWallSegment(cell: { walls: Record<CardinalDirection, boolean> }, direction: CardinalDirection, x1: number, y1: number, x2: number, y2: number): void {
    if (!cell.walls[direction]) return;
    this.drawLine(x1, y1, x2, y2);
  }

  private drawLine(x1: number, y1: number, x2: number, y2: number): void {
    this.beginPath();
    this.moveTo(x1, y1);
    this.lineTo(x2, y2);
    this.strokePath();
  }

  private renderZones(cellSize: number): void {
    const cells = this.grid.getAllCells();

    // Zone colors with transparency - more distinct and visible
    const zoneColors: Record<string, number> = {
      ground: 0x00aa00,    // Bright green
      corridor: 0x0088ff,  // Bright blue
      seat: 0xcc6600,      // Orange/brown (distinct from stairs)
      rowEntry: 0xffff00,  // Yellow/Gold
      stair: 0x666666,     // Gray
      sky: 0x000055,       // Dark blue (very low alpha)
    };

    cells.forEach((cell) => {
      const zoneType = cell.zoneType || 'corridor';
      const color = zoneColors[zoneType] || 0x666666;
      const alpha = zoneType === 'sky' ? 0.05 : 0.3; // Higher alpha for better visibility

      const bounds = this.grid.getCellBounds(cell.row, cell.col);
      this.fillStyle(color, alpha);
      this.fillRect(bounds.x, bounds.y, cellSize, cellSize);
    });
  }

  private renderTransitions(cellSize: number): void {
    const cells = this.grid.getAllCells();

    cells.forEach((cell) => {
      if (!cell.transitionType) return;

      const bounds = this.grid.getCellBounds(cell.row, cell.col);
      const centerX = bounds.x + cellSize / 2;
      const centerY = bounds.y + cellSize / 2;

      // Draw different glyphs for each transition type
      switch (cell.transitionType) {
        case 'rowBoundary':
          // Draw horizontal line across cell (row entry point)
          this.lineStyle(3, 0x00ff00, 0.8);
          this.beginPath();
          this.moveTo(bounds.x + 2, centerY);
          this.lineTo(bounds.x + cellSize - 2, centerY);
          this.strokePath();
          break;

        case 'stairLanding':
          // Draw triangle pointing up (stairs)
          this.fillStyle(0xffff00, 0.6);
          this.beginPath();
          this.moveTo(centerX, bounds.y + 4);
          this.lineTo(bounds.x + 4, bounds.y + cellSize - 4);
          this.lineTo(bounds.x + cellSize - 4, bounds.y + cellSize - 4);
          this.closePath();
          this.fillPath();
          break;

        case 'corridorEntry':
          // Draw circle (corridor access point)
          this.fillStyle(0x00ccff, 0.6);
          this.fillCircle(centerX, centerY, cellSize / 4);
          break;
      }
    });
  }

  private renderDirectionalEdges(cellSize: number): void {
    const cells = this.grid.getAllCells();

    cells.forEach((cell) => {
      const bounds = this.grid.getCellBounds(cell.row, cell.col);
      const centerX = bounds.x + cellSize / 2;
      const centerY = bounds.y + cellSize / 2;
      const arrowLength = cellSize / 3;
      const arrowSize = 4;

      // Draw arrows for allowed outgoing directions
      const directions: Array<{ key: CardinalDirection; dx: number; dy: number }> = [
        { key: 'top', dx: 0, dy: -1 },
        { key: 'right', dx: 1, dy: 0 },
        { key: 'bottom', dx: 0, dy: 1 },
        { key: 'left', dx: -1, dy: 0 },
      ];

      directions.forEach(({ key, dx, dy }) => {
        // Only get the actual values from the cell (no defaults)
        const outgoing = cell.allowedOutgoing?.[key] ?? false;
        const incoming = cell.allowedIncoming?.[key] ?? false;

        // Debug logging for sky cells at edges
        if (cell.zoneType === 'sky' && (cell.col === 0 || cell.col === 1 || cell.col === 30 || cell.col === 31) && cell.row === 0 && key === 'top') {
          console.log(`[GridOverlay] Sky cell (${cell.row},${cell.col}) ${key}: outgoing=${outgoing} incoming=${incoming}`);
          console.log(`[GridOverlay] cell.allowedOutgoing:`, cell.allowedOutgoing);
        }

        if (!outgoing && !incoming) return; // Skip if both blocked

        // Debug: Log any cell at cols 0,1,30,31 that's drawing arrows
        if ((cell.col === 0 || cell.col === 1 || cell.col === 30 || cell.col === 31) && cell.row <= 14) {
          console.log(`[GridOverlay] Drawing arrow for cell (${cell.row},${cell.col}) zone=${cell.zoneType} ${key}: out=${outgoing} in=${incoming}`);
        }

        const endX = centerX + dx * arrowLength;
        const endY = centerY + dy * arrowLength;

        // Color: green if both allowed, yellow if only one direction
        const color = outgoing && incoming ? 0x00ff00 : 0xffaa00;
        const alpha = outgoing && incoming ? 0.6 : 0.4;

        this.lineStyle(2, color, alpha);
        this.beginPath();
        this.moveTo(centerX, centerY);
        this.lineTo(endX, endY);
        this.strokePath();

        // Draw arrowhead if outgoing is allowed
        if (outgoing) {
          this.fillStyle(color, alpha);
          this.beginPath();
          if (dx === 0) {
            // Vertical arrow
            this.moveTo(endX, endY);
            this.lineTo(endX - arrowSize, endY - dy * arrowSize);
            this.lineTo(endX + arrowSize, endY - dy * arrowSize);
          } else {
            // Horizontal arrow
            this.moveTo(endX, endY);
            this.lineTo(endX - dx * arrowSize, endY - arrowSize);
            this.lineTo(endX - dx * arrowSize, endY + arrowSize);
          }
          this.closePath();
          this.fillPath();
        }
      });
    });
  }

  private renderNavigationNodes(): void {
    if (!this.aiManager) {
      console.warn('[GridOverlay] Cannot render nodes: no AIManager');
      return;
    }
    
    const pathResolver = this.aiManager.getPathResolver();
    if (!pathResolver) {
      console.warn('[GridOverlay] Cannot render nodes: no PathResolver');
      return;
    }
    
    const graph = pathResolver.getGraph();
    if (!graph) {
      console.warn('[GridOverlay] Cannot render nodes: no navigation graph');
      return;
    }

    console.log(`[GridOverlay] Rendering ${graph.nodes.size} navigation nodes, ${graph.edges.size} edge sources`);

    // Define colors for each node type
    const nodeColors = {
      corridor: 0x0099ff,   // Blue
      stair: 0xffff00,      // Yellow
      rowEntry: 0x00ff00,   // Green
      seat: 0xff00ff,       // Purple
      ground: 0xff8800,     // Orange
    };

    // First, draw edges (connections between nodes)
    this.lineStyle(1, 0x666666, 0.3);
    let edgesDrawn = 0;
    for (const [nodeId, edges] of graph.edges.entries()) {
      const fromNode = graph.nodes.get(nodeId);
      if (!fromNode) continue;

      for (const edge of edges) {
        const toNode = graph.nodes.get(edge.targetNodeId);
        if (!toNode) continue;

        this.beginPath();
        this.moveTo(fromNode.x, fromNode.y);
        this.lineTo(toNode.x, toNode.y);
        this.strokePath();
        edgesDrawn++;
      }
    }
    console.log(`[GridOverlay] Drew ${edgesDrawn} edges`);

    // Then, draw nodes (so they appear on top of edges)
    let nodesDrawn = 0;
    for (const [nodeId, node] of graph.nodes.entries()) {
      const color = nodeColors[node.type] || 0xffffff;
      this.fillStyle(color, 0.8);
      this.fillCircle(node.x, node.y, 6);
      nodesDrawn++;
    }
    console.log(`[GridOverlay] Drew ${nodesDrawn} nodes`);
  }

  private renderVendorPaths(): void {
    if (!this.aiManager) {
      console.warn('[GridOverlay] Cannot render vendor paths: no AIManager');
      return;
    }
    
    const vendors = this.aiManager.getVendorInstances();
    console.log(`[GridOverlay] Rendering paths for ${vendors.size} vendors`);
    
    let pathsRendered = 0;
    for (const [vendorId, instance] of vendors.entries()) {
      if (!instance.currentPath || instance.currentPath.length === 0) continue;

      pathsRendered++;
      console.log(`[GridOverlay] Vendor ${vendorId} path: ${instance.currentPath.length} segments, current index: ${instance.currentSegmentIndex}`);

      // Check for illegal steps (directional passability violations)
      const illegalSegments: number[] = [];
      for (let i = 1; i < instance.currentPath.length; i++) {
        const from = instance.currentPath[i - 1];
        const to = instance.currentPath[i];
        
        // Check if this step is legal
        if (from.gridRow !== undefined && from.gridCol !== undefined &&
            to.gridRow !== undefined && to.gridCol !== undefined) {
          const isLegal = this.grid.isPassableDirection(from.gridRow, from.gridCol, to.gridRow, to.gridCol);
          if (!isLegal) {
            illegalSegments.push(i - 1);
            console.warn(`[GridOverlay] Illegal step detected: (${from.gridRow},${from.gridCol}) -> (${to.gridRow},${to.gridCol})`);
          }
        }
      }

      // Draw path segments (green for legal, red for illegal)
      for (let i = 0; i < instance.currentPath.length - 1; i++) {
        const from = instance.currentPath[i];
        const to = instance.currentPath[i + 1];
        
        const isIllegal = illegalSegments.includes(i);
        const color = isIllegal ? 0xff0000 : 0x00ff00;
        const width = isIllegal ? 6 : 4;
        
        this.lineStyle(width, color, 1.0);
        this.beginPath();
        this.moveTo(from.x, from.y);
        this.lineTo(to.x, to.y);
        this.strokePath();
        
        // Draw X marker on illegal segments
        if (isIllegal) {
          const midX = (from.x + to.x) / 2;
          const midY = (from.y + to.y) / 2;
          const size = 8;
          
          this.lineStyle(3, 0xff0000, 1.0);
          this.beginPath();
          this.moveTo(midX - size, midY - size);
          this.lineTo(midX + size, midY + size);
          this.strokePath();
          
          this.beginPath();
          this.moveTo(midX + size, midY - size);
          this.lineTo(midX - size, midY + size);
          this.strokePath();
        }
      }

      // Highlight current target segment with pulsing circle
      const currentSegment = instance.currentPath[instance.currentSegmentIndex];
      if (currentSegment) {
        this.fillStyle(0xffff00, this.pulseAlpha);
        this.fillCircle(currentSegment.x, currentSegment.y, 8);
      }
    }
    
    console.log(`[GridOverlay] Rendered ${pathsRendered} vendor paths`);
  }
}

export default GridOverlay;
