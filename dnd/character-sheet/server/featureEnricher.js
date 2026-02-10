const enrichFeature = (feature) => {
    const enriched = { ...feature };

    // 1. Handle explicit 'ability' choices (ASI)
    if (enriched.ability) {
        // Example: ability: [ { choose: { from: ["str", "dex"], amount: 1 } } ]
        // We want to convert this to a 'choices' block IF one doesn't exist.
        // Note: Features can have multiple choices. Our current UI supports ONE 'choices' block per FeatureEntry.
        // We might need to stack them or just pick the primary one.
        
        const choiceRef = enriched.ability.find(a => a.choose);
        if (choiceRef && !enriched.choices) {
            const from = choiceRef.choose.from; // ["str", "dex", ...]
            const count = choiceRef.choose.amount || 1;
            
            enriched.choices = {
                type: 'Ability',
                count: count,
                selected: [],
                // We inject the options here directly since they aren't fetched from API
                _embeddedOptions: from.map(msg => ({
                    name: msg === 'str' ? 'Strength' : 
                          msg === 'dex' ? 'Dexterity' :
                          msg === 'con' ? 'Constitution' :
                          msg === 'int' ? 'Intelligence' :
                          msg === 'wis' ? 'Wisdom' :
                          msg === 'cha' ? 'Charisma' : msg,
                    type: 'Ability'
                }))
            };
        }
    }

    // 2. Handle specific known feats (Elemental Adept, etc.)
    if (enriched.name === 'Elemental Adept' || enriched.name === 'Elemental Adept|XPHB') {
        // If we already have ability choices (from above), we have a conflict.
        // Elemental Adept has BOTH Ability Choice (Int/Wis/Cha) AND Damage Type choice.
        // Our current UI only supports one `choices` object.
        // To handle this, we should probably merge them or nest them?
        // But for now, let's prioritize the "Damage Type" if the Ability choice is just +1 and the main effect is damage.
        // Actually Elemental Adept XPHB allows +1 Int/Wis/Cha.
        
        // Let's CREATE a nested structure. 
        // We can make the Feature have "entries" that ARE the choices?
        // Or we can just overwrite `choices` with a composite if needed.
        
        // For Elemental Adept, the "Damage Type" is the core mechanic. The ASI is secondary (in XPHB).
        // Let's inject a special "Damage Type" choice.
        
        // Strategy: If we have multiple, we might need a "MultiChoice" type? 
        // Or we just inject the Damage Type as the primary `choices` and assume ASI is handled automatically or via a separate entry?
        // Let's inject Damage Type.
        
        /* 
           If use choices, we overwrite the Ability choices derived above.
           Alternative: Make the "Damage Type" choice contain the "Ability" choice? No, that's dependencies.
           
           Let's just inject "Damage Type" for now as it's the user's specific request.
        */
        enriched.choices = { // Overwrite or Set
            type: 'Damage Type',
            count: 1,
            selected: [],
            _embeddedOptions: [
                { name: "Acid", type: "Damage" },
                { name: "Cold", type: "Damage" },
                { name: "Fire", type: "Damage" },
                { name: "Lightning", type: "Damage" },
                { name: "Thunder", type: "Damage" }
            ]
        };
    }
    
    return enriched;
};

export { enrichFeature };
