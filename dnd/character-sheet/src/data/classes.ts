import artificer from '../../../5etools/5etools-src/data/class/class-artificer.json';
import barbarian from '../../../5etools/5etools-src/data/class/class-barbarian.json';
import bard from '../../../5etools/5etools-src/data/class/class-bard.json';
import cleric from '../../../5etools/5etools-src/data/class/class-cleric.json';
import druid from '../../../5etools/5etools-src/data/class/class-druid.json';
import fighter from '../../../5etools/5etools-src/data/class/class-fighter.json';
import monk from '../../../5etools/5etools-src/data/class/class-monk.json';
import paladin from '../../../5etools/5etools-src/data/class/class-paladin.json';
import ranger from '../../../5etools/5etools-src/data/class/class-ranger.json';
import rogue from '../../../5etools/5etools-src/data/class/class-rogue.json';
import sorcerer from '../../../5etools/5etools-src/data/class/class-sorcerer.json';
import warlock from '../../../5etools/5etools-src/data/class/class-warlock.json';
import wizard from '../../../5etools/5etools-src/data/class/class-wizard.json';

export const ALL_CLASSES = [
    ...(artificer.class || []),
    ...(barbarian.class || []),
    ...(bard.class || []),
    ...(cleric.class || []),
    ...(druid.class || []),
    ...(fighter.class || []),
    ...(monk.class || []),
    ...(paladin.class || []),
    ...(ranger.class || []),
    ...(rogue.class || []),
    ...(sorcerer.class || []),
    ...(warlock.class || []),
    ...(wizard.class || [])
];

export const ALL_CLASS_FEATURES = [
    ...(artificer.classFeature || []),
    ...(barbarian.classFeature || []),
    ...(bard.classFeature || []),
    ...(cleric.classFeature || []),
    ...(druid.classFeature || []),
    ...(fighter.classFeature || []),
    ...(monk.classFeature || []),
    ...(paladin.classFeature || []),
    ...(ranger.classFeature || []),
    ...(rogue.classFeature || []),
    ...(sorcerer.classFeature || []),
    ...(warlock.classFeature || []),
    ...(wizard.classFeature || [])
];

export const XPHB_CLASSES = ALL_CLASSES.filter((c: any) => c.source === 'XPHB' && !c._copy);
export const XPHB_CLASS_FEATURES = ALL_CLASS_FEATURES.filter((f: any) => (f.source === 'XPHB' || f.classSource === 'XPHB') && !f._copy);

export const ALL_SUBCLASSES = [
    ...(artificer.subclass || []),
    ...(barbarian.subclass || []),
    ...(bard.subclass || []),
    ...(cleric.subclass || []),
    ...(druid.subclass || []),
    ...(fighter.subclass || []),
    ...(monk.subclass || []),
    ...(paladin.subclass || []),
    ...(ranger.subclass || []),
    ...(rogue.subclass || []),
    ...(sorcerer.subclass || []),
    ...(warlock.subclass || []),
    ...(wizard.subclass || [])
];

// Returns sublcasses for a given class that are from XPHB (either natively or reprinted/copied as XPHB)
export const getXPHBSubclasses = (className: string) => {
    const filtered = ALL_SUBCLASSES.filter(sc => 
        sc.className === className && 
        (sc.source === 'XPHB' || sc.classSource === 'XPHB' || (sc.reprintedAs && sc.reprintedAs.some(r => r.includes('XPHB'))))
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
