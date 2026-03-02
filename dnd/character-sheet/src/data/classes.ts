// Refactored to remove hardcoded JSON imports. These utilities now accept the class data dynamically.

export const getXPHBClasses = (classesData: any[]) => {
    return (classesData || []).filter((c: any) => c.source === 'XPHB' && !c._copy);
};

// Returns subclasses for a given class that are from XPHB (either natively or reprinted/copied as XPHB)
export const getXPHBSubclasses = (className: string, subclassesData: any[]) => {
    const filtered = (subclassesData || []).filter(sc => 
        sc.className === className && 
        (sc.source === 'XPHB' || sc.classSource === 'XPHB' || (sc.reprintedAs && sc.reprintedAs.some((r: string) => r.includes('XPHB'))))
    );

    // Deduplicate by name to prevent React key collisions
    const unique = new Map();
    filtered.forEach(sc => {
        if (!unique.has(sc.name)) {
            unique.set(sc.name, sc);
        }
    });

    return Array.from(unique.values());
};

// Returns XPHB class lore/fluff entries for a given class name
export const getXPHBClassFluff = (className: string, classFluffData: any[]) => {
    return (classFluffData || []).find((f: any) => f.name === className && f.source === 'XPHB');
};
