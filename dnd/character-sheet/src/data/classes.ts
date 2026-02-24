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

// Class Fluff (Lore) imports
import fluffArtificer from '../../../5etools/5etools-src/data/class/fluff-class-artificer.json';
import fluffBarbarian from '../../../5etools/5etools-src/data/class/fluff-class-barbarian.json';
import fluffBard from '../../../5etools/5etools-src/data/class/fluff-class-bard.json';
import fluffCleric from '../../../5etools/5etools-src/data/class/fluff-class-cleric.json';
import fluffDruid from '../../../5etools/5etools-src/data/class/fluff-class-druid.json';
import fluffFighter from '../../../5etools/5etools-src/data/class/fluff-class-fighter.json';
import fluffMonk from '../../../5etools/5etools-src/data/class/fluff-class-monk.json';
import fluffPaladin from '../../../5etools/5etools-src/data/class/fluff-class-paladin.json';
import fluffRanger from '../../../5etools/5etools-src/data/class/fluff-class-ranger.json';
import fluffRogue from '../../../5etools/5etools-src/data/class/fluff-class-rogue.json';
import fluffSorcerer from '../../../5etools/5etools-src/data/class/fluff-class-sorcerer.json';
import fluffWarlock from '../../../5etools/5etools-src/data/class/fluff-class-warlock.json';
import fluffWizard from '../../../5etools/5etools-src/data/class/fluff-class-wizard.json';

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

// Returns subclasses for a given class that are from XPHB (either natively or reprinted/copied as XPHB)
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

// All class fluff aggregated
const ALL_CLASS_FLUFF = [
    ...(fluffArtificer.classFluff || []),
    ...(fluffBarbarian.classFluff || []),
    ...(fluffBard.classFluff || []),
    ...(fluffCleric.classFluff || []),
    ...(fluffDruid.classFluff || []),
    ...(fluffFighter.classFluff || []),
    ...(fluffMonk.classFluff || []),
    ...(fluffPaladin.classFluff || []),
    ...(fluffRanger.classFluff || []),
    ...(fluffRogue.classFluff || []),
    ...(fluffSorcerer.classFluff || []),
    ...(fluffWarlock.classFluff || []),
    ...(fluffWizard.classFluff || [])
];

// Returns XPHB class lore/fluff entries for a given class name
export const getXPHBClassFluff = (className: string) => {
    return ALL_CLASS_FLUFF.find((f: any) => f.name === className && f.source === 'XPHB');
};
