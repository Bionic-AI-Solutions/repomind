/**
 * Fallback diagram templates for when AI generation fails
 */

export const templates = {
    /**
     * Basic linear flow diagram
     */
    basicFlow: (components: string[]) => {
        const sanitized = components.map(c =>
            c.replace(/["'`<>]/g, '')
                .replace(/[\\\/]/g, ' ')
                .replace(/[^a-zA-Z0-9 .,;:!?()\_-]/g, '')
                .trim()
        ).filter(c => c.length > 0);

        if (sanitized.length === 0) {
            sanitized.push('Start', 'Process', 'End');
        }

        return `graph TD
${sanitized.map((c, i) => `  N${i}["${c}"]`).join('\n')}
${sanitized.slice(0, -1).map((_, i) => `  N${i} --> N${i + 1}`).join('\n')}`;
    },

    /**
     * Layered architecture diagram
     */
    layeredArch: (layers: string[]) => {
        const clean = (s: string) => s.replace(/["'`<>]/g, '').replace(/[^a-zA-Z0-9 ]/g, ' ').trim();
        return `graph TB
  subgraph Frontend
    UI["${clean(layers[0] || 'User Interface')}"]
  end
  subgraph Backend
    API["${clean(layers[1] || 'API Layer')}"]
  end
  subgraph Data
    DB["${clean(layers[2] || 'Database')}"]
  end
  UI --> API
  API --> DB`;
    },

    /**
     * Component dependency diagram
     */
    componentDiagram: (components: Array<{ name: string; deps?: string[] }>) => `
graph LR
${components.map(c => `  ${c.name.replace(/[^a-zA-Z0-9]/g, '_')}["${c.name}"]`).join('\n')}
${components.flatMap(c =>
        (c.deps || []).map(d => `  ${c.name.replace(/[^a-zA-Z0-9]/g, '_')} --> ${d.replace(/[^a-zA-Z0-9]/g, '_')}`)
    ).join('\n')}
  `,

    /**
     * Service architecture diagram
     */
    serviceArch: () => `
graph TB
  Client["Client/Browser"]
  LB["Load Balancer"]
  App1["App Server 1"]
  App2["App Server 2"]
  Cache["Redis Cache"]
  DB["Database"]
  
  Client --> LB
  LB --> App1
  LB --> App2
  App1 --> Cache
  App2 --> Cache
  App1 --> DB
  App2 --> DB
  `,
};

/**
 * Validate Mermaid syntax
 * Simplified to avoid false positives with quoted content
 */
export function validateMermaidSyntax(code: string): { valid: boolean; error?: string } {
    try {
        const trimmed = code.trim();

        if (!trimmed) {
            return { valid: false, error: 'Empty diagram code' };
        }

        // Check for basic structural requirements
        const lines = trimmed.split('\n').filter(l => l.trim());
        if (lines.length < 2) {
            return { valid: false, error: 'Diagram must have multiple lines' };
        }

        // Check for valid diagram type
        const validTypes = ['graph', 'flowchart', 'sequenceDiagram', 'classDiagram', 'stateDiagram', 'erDiagram', 'gantt'];
        const hasValidType = validTypes.some(type => trimmed.includes(type));

        if (!hasValidType) {
            return { valid: false, error: 'Invalid or missing diagram type' };
        }

        // We skip bracket counting as it's prone to errors with quoted content
        // and let Mermaid's renderer handle the detailed validation
        return { valid: true };
    } catch (e: any) {
        return { valid: false, error: e.message || 'Unknown validation error' };
    }
}

/**
 * Sanitize text content for Mermaid diagrams
 * Focuses on basic cleanup - AI layer handles complex corrections
 */
function sanitizeMermaidText(text: string): string {
    return text
        // Strip all HTML tags
        .replace(/<[^>]*>/g, ' ')
        // Remove backticks, quotes, angle brackets
        .replace(/[`"'<>]/g, '')
        // Replace slashes and backslashes with spaces
        .replace(/[\\/]/g, ' ')
        // Remove newlines and tabs
        .replace(/[\n\t]/g, ' ')
        // Keep only safe ASCII: a-z A-Z 0-9 space and basic punctuation
        .replace(/[^a-zA-Z0-9 .,;:!?()\-_]/g, '')
        // Collapse multiple spaces
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Sanitize Mermaid code (fix common AI mistakes)
 */
export function sanitizeMermaidCode(code: string, options: { preserveComments?: boolean } = {}): string {
    // 1. Basic cleanup
    let sanitized = code
        .replace(/\r\n/g, '\n'); // Normalize newlines

    // 2. Remove comments (unless preserved)
    if (!options.preserveComments) {
        sanitized = sanitized.split('\n').map(line => {
            const commentIndex = line.indexOf('%%');
            return commentIndex >= 0 ? line.substring(0, commentIndex) : line;
        }).join('\n');
    }

    // 3. Process line by line
    const lines = sanitized.split('\n');
    const processedLines = lines.map(line => {
        let trimmed = line.trim();
        if (!trimmed) return '';

        // Skip directives
        if (trimmed.startsWith('classDef') ||
            trimmed.startsWith('class ') ||
            trimmed.startsWith('click ') ||
            trimmed.startsWith('style ') ||
            trimmed.startsWith('linkStyle ')) {
            return trimmed;
        }

        // Preserve subgraph/flowchart endings
        if (trimmed === 'end') {
            return trimmed;
        }

        // Handle subgraph
        if (trimmed.startsWith('subgraph ')) {
            const title = trimmed.substring(9).trim();
            // If not already quoted
            if (!title.startsWith('"')) {
                const sanitizedTitle = sanitizeMermaidText(title);
                return `subgraph "${sanitizedTitle}"`;
            }
            return trimmed;
        }

        // Handle graph/flowchart declaration
        if (trimmed.match(/^(graph|flowchart)\s/)) {
            // Remove trailing semicolon if present
            trimmed = trimmed.replace(/;$/, '');
            const parts = trimmed.split(/\s+/);
            const type = parts[0];
            const dir = parts[1] || 'TD';
            // Clean dir (remove semicolon if it was attached)
            const cleanDir = dir.replace(';', '');
            const validDirs = ['TB', 'TD', 'BT', 'RL', 'LR'];
            const safeDir = validDirs.includes(cleanDir) ? cleanDir : 'TD';
            return `${type} ${safeDir}`;
        }

        // Check for links (arrows) and handle edge labels
        const arrowPatterns = [
            /-->/,   // Solid arrow
            /---/,   // Link line
            /\.->/,  // Dotted arrow
            /==>/,   // Bold arrow
            /--/     // Double dash
        ];

        const hasArrow = arrowPatterns.some(pattern => pattern.test(trimmed));

        // If this line has an arrow, we need to handle edge labels specially
        if (hasArrow) {
            // Remove quotes from edge labels (text between arrow parts or in pipes)
            // Pattern: A -- "label" --> B  should become  A -- label --> B
            // Pattern: A -->|"label"| B  should become  A -->|label| B

            // Ensure pipe-style edge labels are quoted if they contain special chars or aren't quoted
            // We capture the arrow/pipe start, the content, and the closing pipe
            // Regex explanation:
            // 1. (\||[=-]+>?\||[.-]+>?\|) -> Start of label (e.g., "|", "-->|", "-.->|")
            // 2. \s* -> Optional whitespace
            // 3. (?!"|') -> Negative lookahead: ensure it doesn't already start with a quote
            // 4. (.*?) -> Capture content (non-greedy)
            // 5. \s* -> Optional whitespace
            // 6. (\|) -> Closing pipe
            trimmed = trimmed.replace(/(\||[=-]+>?\||[.-]+>?\|)\s*(?!"|')(.*?)\s*(\|)/g, (match, start, content, end) => {
                if (!content.trim()) return match; // Empty label
                const safeContent = sanitizeMermaidText(content);
                return `${start}"${safeContent}"${end}`;
            });

            // Ensure space-style edge labels are quoted
            // Pattern: -- Label -->
            trimmed = trimmed.replace(/(--+|\.\.+|==+)\s+(?!"|')(.+?)\s+(--+>?|\.\.+>?|==+>?)/g, (match, start, content, end) => {
                if (!content.trim()) return match;
                // Don't touch if it looks like a node definition (e.g. -- Node["Label"])
                if (content.match(/[\[\(\{]/)) return match;

                const safeContent = sanitizeMermaidText(content);
                return `${start} "${safeContent}" ${end}`;
            });

            // Handle incomplete node definitions after arrows
            // Pattern: A --> "Label" (no node ID or shape)
            // Should become: A --> NodeX["Label"]
            // Match: arrow followed by space and quoted text at end of line (no node shape)
            trimmed = trimmed.replace(/(-->|\.->|==>)\s*"([^"]+)"(?!\s*[)\]}>]|\s*--|\s*\.\.|\s*==)/g, (match, arrow, label) => {
                // Generate a simple node ID from the label
                const nodeId = 'N' + sanitizeMermaidText(label).replace(/[^a-zA-Z0-9]/g, '').substring(0, 10);
                const safeLabel = sanitizeMermaidText(label);
                return `${arrow} ${nodeId}["${safeLabel}"]`;
            });
        }

        // Shapes
        const shapes = [
            { start: '\\[\\(', end: '\\)\\]', o: '[(', c: ')]' }, // Database
            { start: '\\[\\[', end: '\\]\\]', o: '[[', c: ']]' }, // Subroutine
            { start: '\\(\\(', end: '\\)\\)', o: '((', c: '))' }, // Circle
            { start: '\\{\\{', end: '\\}\\}', o: '{{', c: '}}' }, // Hexagon
            { start: '\\[\\/', end: '\\/\\]', o: '[/', c: '/]' }, // Parallelogram
            { start: '\\[\\\\', end: '\\\\\\]', o: '[\\', c: '\\]' }, // Parallelogram alt
            { start: '\\[\\/', end: '\\\\\\]', o: '[/', c: '\\]' }, // Trapezoid
            { start: '\\[\\\\', end: '\\/\\]', o: '[\\', c: '/]' }, // Trapezoid alt
            { start: '\\(', end: '\\)', o: '(', c: ')' },       // Round
            { start: '\\[', end: '\\]', o: '[', c: ']' },       // Square
            { start: '\\{', end: '\\}', o: '{', c: '}' },       // Rhombus
            { start: '>', end: '\\]', o: '>', c: ']' }          // Asymmetric
        ];

        let processedLine = trimmed;

        for (const shape of shapes) {
            // If has arrow, use non-greedy matching to avoid spanning multiple nodes
            // If no arrow, use greedy matching to handle nested chars
            const quantifier = hasArrow ? '.*?' : '.*';

            // Regex to find shape usage
            // Global match
            // Using [a-zA-Z0-9_-] instead of \w for clarity and to explicitly allow hyphens/underscores
            const regex = new RegExp(`([a-zA-Z0-9_-]+)\\s*${shape.start}(${quantifier})${shape.end}`, 'g');

            processedLine = processedLine.replace(regex, (match, id, content) => {
                let text = content.trim();
                // Remove existing outer quotes
                if (text.startsWith('"') && text.endsWith('"')) {
                    text = text.slice(1, -1);
                }
                // Sanitize the content properly
                const safeContent = sanitizeMermaidText(text);
                return `${id}${shape.o}"${safeContent}"${shape.c}`;
            });
        }

        // Fallback for plain text "ID Label" (only if no arrow and no shapes matched yet)
        // If processedLine is still same as trimmed (no shapes replaced) AND no arrow
        if (processedLine === trimmed && !hasArrow) {
            const match = trimmed.match(/^([\w-]+)\s+(.+)$/);
            if (match) {
                const id = match[1];
                const label = match[2].trim();
                if (id !== 'end') {
                    const safeLabel = sanitizeMermaidText(label);
                    return `${id}["${safeLabel}"]`;
                }
            }
        }

        return processedLine;
    });

    return processedLines.filter(l => l).join('\n');
}

/**
 * Extract diagram type from code
 */
export function extractDiagramType(code: string): string {
    const match = code.match(/(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt)/);
    return match ? match[1] : 'unknown';
}

/**
 * Get a fallback template based on context
 */
export function getFallbackTemplate(context?: string): string {
    if (!context) {
        return templates.basicFlow(['Start', 'Process', 'End']);
    }

    // Try to infer what kind of diagram to use
    const lower = context.toLowerCase();

    if (lower.includes('layer') || lower.includes('tier')) {
        return templates.layeredArch(['Frontend', 'Backend', 'Database']);
    }

    if (lower.includes('service') || lower.includes('microservice')) {
        return templates.serviceArch();
    }

    if (lower.includes('component') || lower.includes('dependency')) {
        return templates.componentDiagram([
            { name: 'Component A', deps: ['Component B'] },
            { name: 'Component B', deps: ['Component C'] },
            { name: 'Component C', deps: [] }
        ]);
    }

    // Default fallback
    return templates.basicFlow(['Start', 'Process', 'End']);
}

/**
 * Types for JSON-based Mermaid generation
 */
export interface MermaidNode {
    id: string;
    label: string;
    shape?: 'rect' | 'rounded' | 'circle' | 'diamond' | 'database' | 'cloud' | 'hexagon';
}

export interface MermaidEdge {
    from: string;
    to: string;
    label?: string;
    type?: 'arrow' | 'dotted' | 'thick' | 'line';
}

export interface MermaidDiagramData {
    title?: string;
    direction?: 'TB' | 'TD' | 'BT' | 'RL' | 'LR';
    nodes: MermaidNode[];
    edges: MermaidEdge[];
}

/**
 * Generate valid Mermaid code from structured JSON data
 * This guarantees syntax correctness by handling escaping and formatting programmatically
 */
export function generateMermaidFromJSON(data: MermaidDiagramData): string {
    const { direction = 'TD', nodes = [], edges = [] } = data;

    // Helper to sanitize label text (keep it minimal, we will quote it)
    const cleanLabel = (text: string) => {
        return text ? text.replace(/["\n\r]/g, ' ').trim() : '';
    };

    // Helper to sanitize IDs (must be alphanumeric, no spaces)
    const cleanId = (id: string) => {
        return id.replace(/[^a-zA-Z0-9]/g, '_');
    };

    // Helper to get shape syntax
    const getShape = (id: string, label: string, shape?: string) => {
        const safeId = cleanId(id);
        const clean = cleanLabel(label || safeId); // Fallback to ID if label missing
        switch (shape) {
            case 'rounded': return `${safeId}("${clean}")`;
            case 'circle': return `${safeId}(("${clean}"))`;
            case 'diamond': return `${safeId}{"${clean}"}`;
            case 'database': return `${safeId}[("${clean}")]`;
            case 'cloud': return `${safeId}(("${clean}"))`;
            case 'hexagon': return `${safeId}{{"${clean}"}}`;
            case 'rect':
            default: return `${safeId}["${clean}"]`;
        }
    };

    // Helper to get edge syntax
    const getEdge = (type?: string, label?: string) => {
        const clean = label ? cleanLabel(label) : '';
        const labelPart = clean ? `|"${clean}"|` : '';

        switch (type) {
            case 'dotted': return `-.->${labelPart}`;
            case 'thick': return `==>${labelPart}`;
            case 'line': return `---${labelPart}`;
            case 'arrow':
            default: return `-->${labelPart}`;
        }
    };

    const lines = [
        `graph ${direction}`,
        ...nodes.map(n => `  ${getShape(n.id, n.label, n.shape)}`),
        ...edges.map(e => `  ${cleanId(e.from)} ${getEdge(e.type, e.label)} ${cleanId(e.to)}`)
    ];

    return lines.join('\n');
}
