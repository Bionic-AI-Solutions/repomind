/**
 * Fallback diagram templates for when AI generation fails
 */

export const templates = {
    /**
     * Basic linear flow diagram
     */
    basicFlow: (components: string[]) => `
graph TD
${components.map((c, i) => `  ${i}["${c.replace(/"/g, '\\"')}"]`).join('\n')}
${components.slice(0, -1).map((_, i) => `  ${i} --> ${i + 1}`).join('\n')}
  `,

    /**
     * Layered architecture diagram
     */
    layeredArch: (layers: string[]) => `
graph TB
  subgraph "Frontend"
    UI["${layers[0] || 'User Interface'}"]
  end
  subgraph "Backend"
    API["${layers[1] || 'API Layer'}"]
  end
  subgraph "Data"
    DB["${layers[2] || 'Database'}"]
  end
  UI --> API
  API --> DB
  `,

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
 */
export function validateMermaidSyntax(code: string): { valid: boolean; error?: string } {
    try {
        const trimmed = code.trim();

        if (!trimmed) {
            return { valid: false, error: 'Empty diagram code' };
        }

        // Check for valid diagram type
        const validTypes = ['graph', 'flowchart', 'sequenceDiagram', 'classDiagram', 'stateDiagram', 'erDiagram', 'gantt'];
        const hasValidType = validTypes.some(type => trimmed.includes(type));

        if (!hasValidType) {
            return { valid: false, error: 'Invalid or missing diagram type' };
        }

        // Check for balanced brackets
        const openSquare = (trimmed.match(/\[/g) || []).length;
        const closeSquare = (trimmed.match(/\]/g) || []).length;
        if (openSquare !== closeSquare) {
            return { valid: false, error: 'Unbalanced square brackets' };
        }

        const openCurly = (trimmed.match(/\{/g) || []).length;
        const closeCurly = (trimmed.match(/\}/g) || []).length;
        if (openCurly !== closeCurly) {
            return { valid: false, error: 'Unbalanced curly braces' };
        }

        const openParen = (trimmed.match(/\(/g) || []).length;
        const closeParen = (trimmed.match(/\)/g) || []).length;
        if (openParen !== closeParen) {
            return { valid: false, error: 'Unbalanced parentheses' };
        }

        return { valid: true };
    } catch (e: any) {
        return { valid: false, error: e.message || 'Unknown validation error' };
    }
}

/**
 * Sanitize Mermaid code (fix common AI mistakes)
 */
export function sanitizeMermaidCode(code: string): string {
    let sanitized = code
        // Replace backticks with quotes in node labels
        .replace(/`([^`]+)`/g, '"$1"')
        // Remove extra whitespace
        .trim()
        // Ensure proper line breaks
        .replace(/\r\n/g, '\n');

    // Fix node labels with nested quotes and brackets
    // Regex explanation:
    // (\w+)        -> Capture node ID
    // \["          -> Match opening ["
    // (            -> Start capturing content
    //   (?:        -> Non-capturing group for alternation
    //     [^"]     -> Any character that is NOT a quote
    //     |        -> OR
    //     "(?!\])  -> A quote that is NOT followed by a closing bracket ]
    //   )*         -> Repeat 0 or more times
    // )            -> End capturing content
    // "\]          -> Match closing "]
    sanitized = sanitized.replace(/(\w+)\["((?:[^"]|"(?!\]))*)"]/g, (match, id, content) => {
        let text = content;
        // Replace internal double quotes with single quotes
        text = text.replace(/"/g, "'");
        return `${id}["${text}"]`;
    });

    // Handle unquoted labels (fallback)
    // Match id[text] where text doesn't contain " or ]
    sanitized = sanitized.replace(/(\w+)\[([^"\]]+)\]/g, (match, id, text) => {
        // If text contains spaces or special chars, quote it
        if (text.includes(' ') || text.match(/[(),;:]/)) {
            return `${id}["${text.trim()}"]`;
        }
        return match;
    });

    return sanitized;
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
