/*
 * Apollyon Character Sheet Logic (script.js)
 * -----------------------------------------
 * This file contains all client-side logic for the character sheet UI.
 * The code is intentionally verbose and documented for clarity.
 *
 * Responsibilities:
 *  - Build dynamic UI rows/sections
 *  - Provide live calculations (totals, End values)
 *  - Wire up Mote -> Ability dropdown population from a JSON map
 *
 * Author: Manratt Games helper
 */

(() => {
  "use strict";

  // =============================
  // Configuration & Data Models
  // =============================

  /** Core attribute labels in display order. */
  const CORE_ATTRS = ["Strength", "Agility", "Grit", "Spirit", "Speed"];

  /** Calculated attributes and whether they need an extra field (current values for Max HP, BP, Mana). */
  const CALC_ATTRS = [
    { key: "Max HP", extra: "HP" },
    { key: "DR" },
    { key: "AC" },
    { key: "BP", extra: "Current" },
    { key: "Speed" },
    { key: "Mana", extra: "Current" },
  ];

  /**
   * Abilities catalog, loaded from JSON file.
   * Structure: mote name -> list of abilities with name, desc, and details.
   */
  let abilitiesByMote = {
    "": [{"name": "", "desc": "", "details": ""}]
  };

  /**
   * Your abilities data embedded directly in the script to avoid CORS issues.
   * This is your JSON data converted to JavaScript format.
   */
  const abilitiesData = [
    {
      "mote": "Shrail",
      "name": "I Hit Back",
      "details": "When you take damage from an enemy, you may move a number of blocks equal to half your Strength and take a punch action.",
      "desc": "When hit, move half STR in blocks and punch."
    },
    {
      "mote": "Shrail",
      "name": "Vitality of Rage",
      "details": "Gain +3 Grit and +Strength Max HP.",
      "desc": "+3 Grit, bonus Max HP equal to STR."
    },
    {
      "mote": "Shrail",
      "name": "Muscle of the Butcher",
      "details": "Gain +3 Strength and once per turn when you take damage, gain 1 Strength.",
      "desc": "+3 STR; once/turn when damaged, +1 STR."
    },
    {
      "mote": "Shrail",
      "name": "Unfeeling Berserker",
      "details": "Gain Strength max BP and 2x Strength HP.",
      "desc": "Extra Max BP = STR; extra HP = 2×STR."
    },
    {
      "mote": "Shrail",
      "name": "Execute",
      "details": "Gain the following Boost: [Execute: You may spend 6 boost points when you hit with an attack. You learn whether the attack's maximum possible damage roll is greater than the health of the enemy. If it is, kill them. Otherwise, regain 6 BP.]",
      "desc": "6 BP: on hit, check if max damage could kill; if yes, enemy dies; if no, refund 6 BP."
    },
    {
      "mote": "Shrail",
      "name": "Rage at the Dying of the Light",
      "details": "Gain the following Boost: [Un-Die: When you are reduced to 0 HP from damage which is not you, you may spend 1 boost point and stay at one HP. Any HP that you did not actually lose does not count as damage. Once per round when you use this, at the beginning of your next turn this boost costs one more.]",
      "desc": "Cheat death to 1 HP (cost increases each round)."
    },
    {
      "mote": "Shrail",
      "name": "Unyielding Assault",
      "details": "Gain the following Boost: [Rage: When you use a minor action you may spend 3 boost points. Instead of the normal effect of the minor action, you may take an attack action for free. This is considered \"taking a minor action.\"]",
      "desc": "Spend 3 BP: convert minor action into free attack."
    },
    {
      "mote": "Shrail",
      "name": "Beat to Death",
      "details": "Gain the following Boost: [Beatdown: Once per turn, you may spend 1 boost point when taking the punch action to take another punch action.]",
      "desc": "1 BP: punch again (once/turn)."
    },
    {
      "mote": "Shrail",
      "name": "Masochism",
      "details": "Whenever you take damage, gain a number of boost points equal to the amount of damage you took divided by five, rounding up.",
      "desc": "Gain BP equal to damage ÷ 5 (round up) whenever hurt."
    },
    {
      "mote": "Shrail",
      "name": "Fist Fighter",
      "details": "When you attack, you may take a punch action as a movement action. In addition, your punches do Str damage instead of Str/2.",
      "desc": "Punch as movement; punches deal full STR damage."
    },
    {
      "mote": "Shrail",
      "name": "Fight Long",
      "details": "Gain an additional amount of HP equal to quadruple your Strength.",
      "desc": "Bonus Max HP = 4×STR."
    },
    {
      "mote": "Shrail",
      "name": "Fury Casting",
      "details": "Gain Spirit Mana (this increases if you gain spirit). Gain access to one of the following aspects of magic: Blood, Oath, Wild. Also, learn 3 spells.",
      "desc": "Spirit Mana; choose Blood/Oath/Wild; learn 3 spells."
    },
    {
      "mote": "Shrail",
      "name": "Fury Craft",
      "details": "Learn the following Enhancement: When you attack, as a boost you may spend up to 2 BP, increasing the damage the attack does by 5 for each point. If the creator of this item is wielding it, you may instead spend up to 4 BP.",
      "desc": "Learn the Fury Craft."
    },
    {
        "mote": "Pelian",
        "name": "Only In Death Will You Be Rid Of Me",
        "details": "When you are reduced to 0 HP, you may regain (Spirit)d12 health once per combat. Damage that would reduce you to below 0 HP is not dealt. This is not negatable.",
        "desc": "Once per combat, instead of dying, restore (Spirit)d12 HP."
    },
    {
        "mote": "Pelian",
        "name": "Mind Over Body",
        "details": "Gain +3 Grit and you may use the \u2018Cleanse\u2019 effect (found in the Official Spellbuilder) on yourself at the end of each of your turns.",
        "desc": "+3 Grit; auto-Cleanse yourself each turn."
    },
    {
        "mote": "Pelian",
        "name": "Impossible Ambition",
        "details": "Gain +3 Spirit and do an additional ten damage when you hit with an attack when your HP is less than half of your Max HP.",
        "desc": "+3 Spirit; below half HP, +10 damage on hits."
    },
    {
        "mote": "Pelian",
        "name": "I Will Myself Forward",
        "details": "Gain +3 Strength and you may Dash with Strength instead of Agility.",
        "desc": "+3 STR; Dash uses STR instead of AGI."
    },
    {
        "mote": "Pelian",
        "name": "You Have No Right",
        "details": "Gain the following Boost: [Catch the Arm: When an enemy would damage you, you may spend 1 boost point and double your DR for the rest of the turn.]",
        "desc": "1 BP: double DR for the turn when damaged."
    },
    {
        "mote": "Pelian",
        "name": "I Came For You",
        "details": "Gain the following Boost: [{C} Mark: At the start of your turn you may spend 3 boost points and select an enemy. That enemy cannot apply cleansable debuffs to you, and takes 10 extra damage when you hit them. You may only mark one enemy this way at a time.]",
        "desc": "3 BP: mark an enemy, prevent cleansable debuffs on you, deal +10 damage to them."
    },
    {
        "mote": "Pelian",
        "name": "Do Not Touch Them",
        "details": "Gain the following Reaction: [Protect: Trigger: An ally (not you) within a block of you is attacked. Effect: Redirect the attack to you, and it does half its regular damage (this reduction is applied after boosts but before DR).]",
        "desc": "Reaction: redirect attack from adjacent ally; you take half damage."
    },
    {
        "mote": "Pelian",
        "name": "Never Without a Fight",
        "details": "Gain the following Boost: [Take Down With You: When you are damaged, you may spend 3 boost points to take an attack action against whomever damaged you.]",
        "desc": "3 BP: when damaged, make an attack against the source."
    },
    {
        "mote": "Pelian",
        "name": "Relentless Pursuit",
        "details": "When an enemy within 5 blocks of you declares a Running or Dashing action, you may take a free movement action after their action resolves, and take a free punch action if you end that movement next to them.",
        "desc": "Free move after enemy runs/dashes within 5; if adjacent, also punch."
    },
    {
        "mote": "Pelian",
        "name": "Bulwark of Mind",
        "details": "Gain an additional amount of HP equal to quadruple your Spirit.",
        "desc": "Bonus Max HP = 4\u00d7Spirit."
    },
    {
        "mote": "Pelian",
        "name": "Never Surrender",
        "details": "Gain the following Boost: [Refuse: When you are damaged, you may spend 3 boost points to gain half Spirit DR for that damage. If the enemy ignores DR, they instead ignore half DR for that damage.]",
        "desc": "3 BP: gain half Spirit as DR vs that damage (even partly against ignore DR)."
    },
    {
        "mote": "Pelian",
        "name": "Zeal Casting",
        "details": "Gain Spirit Mana (this increases if you gain spirit). Gain access to one of the following aspects of magic: Hollow, Oath, Soul. Also, learn 3 spells.",
        "desc": "Spirit Mana; choose Hollow/Oath/Soul; learn 3 spells."
    },
    {
        "mote": "Pelian",
        "name": "Zeal Craft",
        "details": "Learn the following Enhancement: Gain 0.3xHP HP rounding up. If you are the creator of this item, after you take damage and your HP is below half, you may spend 4 boost points and regain 1/4 your max HP rounding up. Once you use this ability, it may not be used until the beginning of your next turn.",
        "desc": "Learn the Zeal Craft."
    },
    {
        "mote": "Isheilah",
        "name": "Last Minute Preparations",
        "details": "When you take the Preparing action, you gain three preparations instead of one.",
        "desc": "Prepare 3 instead of 1."
      },
      {
        "mote": "Isheilah",
        "name": "Humor in Suffering",
        "details": "Gain +3 Spirit and when you take 10 or more damage from an enemy in one instance, you regain 1 BP.",
        "desc": "+3 Spirit; regain 1 BP if you take \u226510 damage at once."
      },
      {
        "mote": "Isheilah",
        "name": "Are You Sure About That?",
        "details": "Gain the following Boost: [Jokes On You: You may spend 4 boost points when you take the Block or Roll reaction. If you do, redirect the attack to someone within one block of you. You must spend an additional two boost points to redirect an enemy into hitting themselves.]",
        "desc": "4 BP: redirect attack to another within 1 block; +2 BP to make them hit themselves."
      },
      {
        "mote": "Isheilah",
        "name": "Dodge",
        "details": "Gain the following Reaction: [Dodge: Trigger: Enemy lands a glancing blow against you. Effect: They do no damage.]",
        "desc": "Reaction: nullify glancing blow damage."
      },
      {
        "mote": "Isheilah",
        "name": "Big Whiff",
        "details": "Gain the following Reaction: [Missed Me: Trigger: An enemy beat your AC on an attack. Effect: For the purposes of this attack, the enemy failed to beat your AC.]",
        "desc": "Reaction: turn a hit into a miss."
      },
      {
        "mote": "Isheilah",
        "name": "Tools of the Trade",
        "details": "You may drink any number of potions over the course of a combat and may drink a potion at the end of your turn.",
        "desc": "Unlimited potions per combat; free drink at end of turn."
      },
      {
        "mote": "Isheilah",
        "name": "Spellslinger",
        "details": "Gain the following boost: [Spellsling: When you use a normal reaction, instead of using that reaction you may spend 4 boost points and take a cast action.]",
        "desc": "4 BP: trade reaction for cast action."
      },
      {
        "mote": "Isheilah",
        "name": "Make Fizzle",
        "details": "Gain the following reaction: [Counterspell: Trigger: Enemy declares a cast action. Effect: The cast action fails, but they still spend the mana.]",
        "desc": "Reaction: counter enemy cast (they still pay mana)."
      },
      {
        "mote": "Isheilah",
        "name": "Make Slippery",
        "details": "Gain the following boost: [Make Slip: When an enemy within 10 blocks begins moving for any reason, you may spend 2 boost points and make their movement end].",
        "desc": "2 BP: stop enemy movement within 10."
      },
      {
        "mote": "Isheilah",
        "name": "Hanged",
        "details": "Whenever you take damage, you may spend boost points or mana up to half the amount of damage dealt rounded up. Reduce the amount of damage you take by double the resources you spent.",
        "desc": "Spend BP/mana up to half damage taken; reduce damage by 2\u00d7 spent."
      },
      {
        "mote": "Isheilah",
        "name": "Quick Foot",
        "details": "Gain the following Boost: [Sprint: Once per round when you are damaged, you may spend 1 boost point to gain a movement action for your next turn.]",
        "desc": "1 BP: once/round when damaged, get extra move next turn."
      },
      {
        "mote": "Isheilah",
        "name": "Guile Casting",
        "details": "Gain Spirit Mana (this increases if you gain spirit). Gain access to one of the following aspects of magic: Wild, Illusion, Fey. Also, learn 3 spells.",
        "desc": "Spirit Mana; choose Wild/Illusion/Fey; learn 3 spells."
      },
      {
        "mote": "Isheilah",
        "name": "Guile Craft",
        "details": "You may always act as if the attack action triggers Cut Down, even with melee weapons. This reaction triggers after the attack resolves. If the creator of this item is wielding it, Whenever you make a Cut Down reaction, it does double damage and the damage it deals cannot be reduced. ",
        "desc": "Learn the Guile Craft."
      },
      {
        "mote": "Numo",
        "name": "Imbue Hallucination",
        "details": "Gain the following Boost: [Make Remember: When you target an enemy with a major action, you may spend 1 boost point to inflict -(Spirit) to hit for their next turn. This does not stack with itself.]",
        "desc": "1 BP: impose \u2013Spirit to hit on target next turn (no stacking)."
      },
      {
        "mote": "Numo",
        "name": "Trapped Thought Process",
        "details": "Gain the following cast action:{C} Select an action (such as \u201cAttack\u201d) and an enemy. That enemy takes an amount of damage equal to your spirit every time they take that action until the end of combat.",
        "desc": "Cast: tag enemy+action; they take Spirit damage whenever they use it (until combat ends)."
      },
      {
        "mote": "Numo",
        "name": "Obsession",
        "details": "Gain +3 Spirit, and on your turn, you do 5 more damage when you hit the enemy who started the turn closest to you with an attack.",
        "desc": "+3 Spirit; +5 damage vs enemy who began turn closest to you."
      },
      {
        "mote": "Numo",
        "name": "Rewind",
        "details": "Gain the following Boost: [Undo: After an action is taken you may spend 6 boost points. The effect from that action is undone and the action is lost.]",
        "desc": "6 BP: undo the last action\u2019s effect."
      },
      {
        "mote": "Numo",
        "name": "Implant Thought",
        "details": "Gain the following Boost: [Incept: When you take a minor action, you may spend 5 boost points and make an enemy take a major action that you control.]",
        "desc": "5 BP: force enemy to take a major action you control."
      },
      {
        "mote": "Numo",
        "name": "Distract",
        "details": "Gain the following Boost: [{C} Unthink: When you take a minor action, you may spend 2 boost points and target an enemy. That enemy cannot declare you as a target for any action until the end of their next turn.]",
        "desc": "2 BP: one enemy cannot target you until end of their next turn."
      },
      {
        "mote": "Numo",
        "name": "Visions",
        "details": "Gain +(Spirit) to hit all enemies that you can see.",
        "desc": "+Spirit to hit all visible enemies."
      },
      {
        "mote": "Numo",
        "name": "Echo of the Past",
        "details": "Gain the following Boost: [Replay: After casting a spell, you may spend 2 boost points and cast it again. You may only use this once per round.]",
        "desc": "2 BP: recast last spell (once/round)."
      },
      {
        "mote": "Numo",
        "name": "Mind Read",
        "details": "Gain the following Boost: [Read Mind: Once per action when you take a minor action, you may select a target within 10 blocks and spend 1 boost point. You learn their base character sheet and may deal Spirit/2 damage to them.]",
        "desc": "1 BP minor: view target\u2019s base sheet and deal Spirit/2 damage."
      },
      {
        "mote": "Numo",
        "name": "Mental Assault",
        "details": "When you use the punch action, you may use your Spirit instead of your Strength. In addition, when you punch you do 3 extra damage.",
        "desc": "Punch with Spirit instead of STR; +3 damage on punches."
      },
      {
        "mote": "Numo",
        "name": "Revert",
        "details": "Once per combat when you would die you instead have half your maximum HP at the end of the action. This cannot be negated.",
        "desc": "Once/combat: instead of dying, end action at half HP."
      },
      {
        "mote": "Numo",
        "name": "Memory Casting",
        "details": "Gain Spirit Mana (this increases if you gain spirit). Gain access to one of the following aspects of magic: Mind, Divination, Hollow. Also, learn 3 spells.",
        "desc": "Spirit Mana; choose Mind/Divination/Hollow; learn 3 spells."
      },
      {
        "mote": "Numo",
        "name": "Memory Craft",
        "details": "Learn the following Enhancement: Once per combat, at the start of your turn regain a number of boost points equal to your Spirit. If the creator of this item is wielding it, instead regain all your boost points.",
        "desc": "Learn the Memory Craft."
      },
      {
        "mote": "Etill",
        "name": "Float Away",
        "details": "Gain the following Boost: [Drift: When you are damaged, you may spend 1 boost point and take a movement action.]",
        "desc": "1 BP: when damaged, take a move action."
      },
      {
        "mote": "Etill",
        "name": "Flowing Mind",
        "details": "Gain an additional amount of Max BP equal to your Agility and additional HP equal to double your Agility.",
        "desc": "+Max BP = AGI; +HP = 2\u00d7AGI."
      },
      {
        "mote": "Etill",
        "name": "Ease of Mind",
        "details": "Gain +3 Spirit and gain a free preparation at the start of each round.",
        "desc": "+3 Spirit; free prep at start of each round."
      },
      {
        "mote": "Etill",
        "name": "Phase Through",
        "details": "You may move through enemies and obstacles as though they are not there, and enemies cannot react or boost in response to your movement.",
        "desc": "Move through enemies/obstacles; immune to reactions/boosts from movement."
      },
      {
        "mote": "Etill",
        "name": "With the Wind",
        "details": "Gain the following Boost: [Ride: You may spend 2 boost points when you take a movement action and take an additional movement action at the conclusion of that movement action.]",
        "desc": "2 BP: chain an extra movement after moving."
      },
      {
        "mote": "Etill",
        "name": "Half Here",
        "details": "Halve damage from attacks that glanced against you.",
        "desc": "Glancing hits deal half damage to you."
      },
      {
        "mote": "Etill",
        "name": "Drown",
        "details": "Gain the following Boost: [Drown: When you do damage to an enemy, you may spend 3 boost points and do an additional amount of damage equal to your Spirit.]",
        "desc": "3 BP: add Spirit damage on a hit."
      },
      {
        "mote": "Etill",
        "name": "Rushing Torrent",
        "details": "Gain the following Boost: [Rush: After ending a movement action next to an enemy, you may spend 5 boost points and take a major action once per enemy per round.]",
        "desc": "5 BP: end movement adjacent \u2192 gain major action (once per enemy/round)."
      },
      {
        "mote": "Etill",
        "name": "Riptide",
        "details": "Gain the following Boost: [Pull Under: After resolving the effects of a major action you made targeting an enemy, you may spend 3 boost points and reduce their Agility by your Spirit until the end of their next turn.]",
        "desc": "3 BP: after a major vs enemy, reduce their AGI by your Spirit."
      },
      {
        "mote": "Etill",
        "name": "The Tide Comes In",
        "details": "Gain +3 Agility. In addition, at the start of each of your turns, increase your agility by 1.",
        "desc": "+3 AGI; AGI increases +1 each turn."
      },
      {
        "mote": "Etill",
        "name": "Size of the Ocean",
        "details": "Gain an additional amount of HP equal to quadruple your Agility.",
        "desc": "Bonus Max HP = 4\u00d7AGI."
      },
      {
        "mote": "Etill",
        "name": "Flow Casting",
        "details": "Gain Spirit Mana (this increases if you gain spirit). Gain access to one of the following aspects of magic: Elemental, Wild, Fey. Also, learn 3 spells.",
        "desc": "Spirit Mana; choose Elemental/Wild/Fey; learn 3 spells."
      },
      {
        "mote": "Etill",
        "name": "Flow Craft",
        "details": "Learn the following Enhancement: You may substitute 2 minor actions for a major action, and vice versa. You may also substitute 2 movement actions for a minor action, or 1 minor action for a movement action. This substitution may be done before or after any of your actions. If the creator of this item is wielding it, gain a movement action.",
        "desc": "Learn the Flow Craft."
      },
      {
        "mote": "Ursa",
        "name": "Oblivious",
        "details": "Gain the following Boost: [Ignore: At the beginning of your turn you may spend 2 boost points. Enemies may not declare reactions or boosts in response to your actions until the end of your turn. Reactions and Boosts cannot be declared against this boost.]",
        "desc": "2 BP at start of turn: enemies cannot react/boost against you this turn."
      },
      {
        "mote": "Ursa",
        "name": "Living in the Back of the Brain",
        "details": "Gain +3 Spirit and you may reduce damage from Cast actions by 5.",
        "desc": "+3 Spirit; \u20135 damage from cast actions."
      },
      {
        "mote": "Ursa",
        "name": "Don\u2019t Care",
        "details": "Gain +4 Damage Resistance and you may reduce damage from sources which do not target you by 5.",
        "desc": "+4 DR; \u20135 damage from non-targeted sources."
      },
      {
        "mote": "Ursa",
        "name": "Nightmare Nightmare Nightmare",
        "details": "Gain the following Boost: [{C} Shadows Everywhere: When you take a minor action you may spend X boost points and target an enemy. The enemy gets -X to hit for the remainder of combat.]",
        "desc": "X BP minor: target gets \u2013X to hit for entire combat."
      },
      {
        "mote": "Ursa",
        "name": "Fear The Unknown",
        "details": "Until an enemy successfully hits you in combat, gain 6 Agility and 4 DR. You lose this Agility and DR when you are hit.",
        "desc": "Start of combat: +6 AGI & +4 DR until first hit."
      },
      {
        "mote": "Ursa",
        "name": "Acute Fascination",
        "details": "Gain the following Boost: [{C} Hyperfixation: You may spend 2 boost points at the end of your turn and select an enemy. Once per turn, when you would glance against that enemy, you hit instead. If you crit, you may add your Strength to the damage roll. You may only fixate on one enemy this way at a time.]",
        "desc": "2 BP end of turn: fixate on an enemy; glances hit, crits add STR."
      },
      {
        "mote": "Ursa",
        "name": "Sudden Sleep",
        "details": "Gain the following Boost: [Sleep: As a major action, you may spend 6 boost points and have your mana and HP restored to their maximum values. This ends your turn.]",
        "desc": "6 BP major: fully restore HP and Mana; end turn."
      },
      {
        "mote": "Ursa",
        "name": "Devour Dream",
        "details": "When you hit an enemy, regain BP equal to the amount of BP they are missing.",
        "desc": "On hit, regain BP equal to target's missing BP."
      },
      {
        "mote": "Ursa",
        "name": "Sleep Walk",
        "details": "If you have no boost points at the start of your turn, you may take 2 movement actions instead of 1 and 2 major actions instead of 1.",
        "desc": "At 0 BP at start: double moves and majors this turn."
      },
      {
        "mote": "Ursa",
        "name": "Restful Sleep",
        "details": "Gain the following Boost: [Give Rest: As a minor action, you may spend 5 boost points. Allies within 10 blocks heal an amount equal to your Spirit.]",
        "desc": "5 BP minor: allies within 10 heal Spirit HP."
      },
      {
        "mote": "Ursa",
        "name": "Dream of Time Gone By",
        "details": "Gain the following Boosts: [{C} Set: At the start of your turn you may spend 4 boost points. Mark your current HP, Mana and position. This your \u201cSet State.\u201d]\n[Dream: At the start of your turn you may spend 4 boost points. Return to your \u201cSet State and you no longer have your Set State.\u201d]",
        "desc": "4 BP: set a checkpoint (HP, Mana, position); 4 BP later to return to it."
      },
      {
        "mote": "Ursa",
        "name": "Dream Casting",
        "details": "Gain Spirit Mana (this increases if you gain spirit). Gain access to one of the following aspects of magic: Illusion, Shadow, Soul. Also, learn 3 spells.",
        "desc": "Spirit Mana; choose Illusion/Shadow/Soul; learn 3 spells."
      },
      {
        "mote": "Ursa",
        "name": "Dream Craft",
        "details": "Learn the following Enhancement: Gain 10 boost points. If the creator of this item is wielding it, instead of gaining boost points, gain 5 spirit.",
        "desc": "Learn the Dream Craft."
      },
      {
        "mote": "Lichor",
        "name": "Black Blood",
        "details": "Gain the following Boost: [Hostile Blood: When you take damage from an enemy within melee range, you may spend 3 boost points and deal an amount of damage equal to Grit to that enemy.]",
        "desc": "3 BP: when damaged in melee, deal Grit damage back."
      },
      {
        "mote": "Lichor",
        "name": "Manually Coagulate",
        "details": "Gain +3 Grit and when you take a minor action, you may take X irreducible damage and heal another ally within 5 by X.",
        "desc": "+3 Grit; can self-damage on minor to heal ally for same amount."
      },
      {
        "mote": "Lichor",
        "name": "Hardened Blood",
        "details": "Gain +4 Damage Resistance and increase damage you deal from attacks you hit with by half your Damage Resistance.",
        "desc": "+4 DR; deal +\u00bd DR damage on hits."
      },
      {
        "mote": "Lichor",
        "name": "Gush",
        "details": "During the start of your turn, you may take any amount of damage which is not affected by damage resistance. For every four damage you take, you may regain a boost point.",
        "desc": "At start of turn, self-damage (ignores DR); regain 1 BP per 4 damage taken."
      },
      {
        "mote": "Lichor",
        "name": "Blood Weapon",
        "details": "Gain the following Boost: [Blood Burst: You may spend 2 boost points during any die roll you make and replace any stat with grit for that roll.]",
        "desc": "2 BP: replace any stat with Grit for a roll."
      },
      {
        "mote": "Lichor",
        "name": "The Number of Blood",
        "details": "Gain the following Boost: [Angel Number: Spend 5 boost points when doing damage with an attack that hit. Do 5d6 extra damage. If the enemy is reduced to 0 HP, regain 5 boost points and 5d6 health.]",
        "desc": "5 BP: +5d6 damage; if kill, regain 5 BP and 5d6 HP."
      },
      {
        "mote": "Lichor",
        "name": "Hemorrhage",
        "details": "Gain the following boost: [{C} Make Bleed: Spend 2 boost points when you hit, the target suffers (Your Grit) damage at the start of the turn for the rest of combat. This does not stack with itself.]",
        "desc": "2 BP: inflict bleed = Grit each turn (non-stacking)."
      },
      {
        "mote": "Lichor",
        "name": "Stop Bleeding",
        "details": "When given a cleansable effect, you may decide to not be given it instead.",
        "desc": "Can refuse cleansable effects."
      },
      {
        "mote": "Lichor",
        "name": "Made of Liquid",
        "details": "Gain Grit max BP and 2x Grit HP.",
        "desc": "Extra Max BP = Grit; extra HP = 2\u00d7Grit."
      },
      {
        "mote": "Lichor",
        "name": "Blast of Blood",
        "details": "Gain the following Minor action: Explode: Deal damage equal to your Grit/2 to all enemies within 4 blocks.",
        "desc": "Minor: deal Grit/2 damage to all within 4."
      },
      {
        "mote": "Lichor",
        "name": "Absorb Blood",
        "details": "Gain the following Boost: [Absorb: At the start of your turn, spend 6 boost points. Regain HP equal to 1/4 of the damage you deal to enemies during your turn at the end of your turn.]",
        "desc": "6 BP at start: heal 25% of damage dealt this turn."
      },
      {
        "mote": "Lichor",
        "name": "Blood Casting",
        "details": "Gain Spirit Mana (this increases if you gain spirit). Gain access to one of the following aspects of magic: Blood, Soul, Hollow. Also, learn 3 spells.",
        "desc": "Spirit Mana; choose Blood/Soul/Hollow; learn 3 spells."
      },
      {
        "mote": "Lichor",
        "name": "Blood Craft",
        "details": "Learn the following Enhancement: As a minor action, heal equal to twice your DR. If the creator of this item is wielding it, instead heal 4 times your DR.",
        "desc": "Learn the Blood Craft."
      },
      {
        "mote": "Dawel",
        "name": "Step Through Shadows",
        "details": "Gain the following Boost: [Shadow Step: At the beginning of your turn you may spend 1 boost point and appear anywhere that enemies cannot see within the combat zone, or spend 4 boost points and appear anywhere.]",
        "desc": "1 BP: teleport to unseen spot; 4 BP: teleport anywhere."
      },
      {
        "mote": "Dawel",
        "name": "Wisdom",
        "details": "Gain +3 Spirit and do an additional damage with your attacks for each ally who took their turn before you this round.",
        "desc": "+3 Spirit; +1 damage per ally who acted before you this round."
      },
      {
        "mote": "Dawel",
        "name": "Unspeak",
        "details": "Gain the following Boost: [Unspeak: You may spend X boost points when an enemy declares a boost where they spend X boost points. The boost does not happen and the resources are not spent. They \u201cregain\u201d the BP after Unspeak resolves. This BP regain cannot be stopped. After a boost fully resolves, it cannot be unspoken.]",
        "desc": "X BP: cancel an enemy boost as declared (they regain BP)."
      },
      {
        "mote": "Dawel",
        "name": "Silent Strike",
        "details": "When you crit, do an additional amount of damage equal to double one of your damage attributes for that attack.",
        "desc": "On crit, deal +2\u00d7 one damage attribute."
      },
      {
        "mote": "Dawel",
        "name": "Unheard, Unseen",
        "details": "Gain the following Boost: [Block With Darkness: When an enemy hits you with an attack, you may spend 2 boost points to make them glance].",
        "desc": "2 BP: turn a hit into a glance."
      },
      {
        "mote": "Dawel",
        "name": "Shut Them Up",
        "details": "Gain the following Boost: [Silence: When you target an enemy with a cast action, you may spend 2 boost points. The target may not take any boosts until the end of your next turn.]",
        "desc": "2 BP: silence target (no boosts until your next turn)."
      },
      {
        "mote": "Dawel",
        "name": "Reverse Entropy",
        "details": "Enemies within 3 blocks of you cannot increase their attributes or calculated attributes.",
        "desc": "Enemies within 3 cannot increase stats or calculated attributes."
      },
      {
        "mote": "Dawel",
        "name": "Noise Void",
        "details": "Gain the following Boost: [{C} Create Void: At the start of your turn you may spend X boost points. Enemies within 8 blocks of you must spend X additional BP to boost until the start of your next turn.]",
        "desc": "X BP start of turn: enemies within 8 pay +X BP for boosts."
      },
      {
        "mote": "Dawel",
        "name": "Shadow in the Dark",
        "details": "Enemies cannot declare reactions on your turn.",
        "desc": "Enemies cannot react during your turn."
      },
      {
        "mote": "Dawel",
        "name": "Draw Volume",
        "details": "Every time another character boosts, add 1 to your Volume pool. You may spend Volume instead of BP whenever you would spend BP. You may only gain 3 Volume per turn.",
        "desc": "Gain Volume when others boost (max 3/turn); spend as BP."
      },
      {
        "mote": "Dawel",
        "name": "Not There",
        "details": "Gain the following Boost: [Be-Not: When you are affected by an ability, casts, boost, reaction or attack which did not target you, you may spend 2 boost points to be unaffected. This cannot be used against effects caused by abilities, casts, boosts, reactions and attacks which did target you].",
        "desc": "2 BP: ignore non-targeted effects."
      },
      {
        "mote": "Dawel",
        "name": "Silence Casting",
        "details": "Gain Spirit Mana (this increases if you gain spirit). Gain access to one of the following aspects of magic: Shadow, Void, Divination. Also, learn 3 spells.",
        "desc": "Spirit Mana; choose Shadow/Void/Divination; learn 3 spells."
      },
      {
        "mote": "Dawel",
        "name": "Silence Craft",
        "details": "Learn the following Enhancement: When someone glances against you, you regain 3 boost points. If the creator of this item is wielding it, when someone glances against you, you regain an additional 3 boost points.",
        "desc": "Learn the Silence Craft."
      },
      {
        "mote": "Grisha",
        "name": "You\u2019re Next",
        "details": "{C} When you reduce an enemy to 0 HP, choose another enemy. That enemy suffers a Mind Break until the end of combat, as well as -2 to Spirit and Grit. Then take an additional major action.",
        "desc": "On kill: another enemy suffers Mind Break, -2 Spirit/Grit, and you gain a major action."
      },
      {
        "mote": "Grisha",
        "name": "Death, Swift",
        "details": "Gain +3 Agility and you may take a movement action whenever you kill an enemy.",
        "desc": "+3 AGI; free move on kill."
      },
      {
        "mote": "Grisha",
        "name": "Doom Desire",
        "details": "Gain +3 Spirit and you may attack an adjacent enemy when you are killed.",
        "desc": "+3 Spirit; make attack on death."
      },
      {
        "mote": "Grisha",
        "name": "Uncast",
        "details": "When an enemy spends mana, you cannot take damage for the rest of the turn.",
        "desc": "If enemy spends mana, you are immune to damage that turn."
      },
      {
        "mote": "Grisha",
        "name": "Return Fire",
        "details": "Gain the following Boost: [Hex Duel: After an enemy uses a cast action or spends boost points, you may spend 4 boost points and immediately cast a spell or make an attack targeting them.]",
        "desc": "4 BP: respond instantly with spell or attack when enemy casts/spends BP."
      },
      {
        "mote": "Grisha",
        "name": "Disintegrate",
        "details": "{C} Lower one of an enemy\u2019s attributes or movement speed by 2 when you hit them until the end of combat (If enemies lose grit, they lose max HP before they take damage).",
        "desc": "On hit: reduce attribute or speed by 2 until end of combat."
      },
      {
        "mote": "Grisha",
        "name": "Boundless Hunger",
        "details": "When you regain BP, you gain Max BP instead.",
        "desc": "BP gained increases Max BP instead."
      },
      {
        "mote": "Grisha",
        "name": "Entropy",
        "details": "Enemies that start their turn within 6 blocks of you take damage equal to 1/2 of your Spirit at the start of their turn, rounding up, ignoring DR.",
        "desc": "Nearby enemies take Spirit/2 damage at start of their turn, ignoring DR."
      },
      {
        "mote": "Grisha",
        "name": "Devour Metaphysical",
        "details": "Gain the following Boost: [Devour: When you hit an enemy with an attack and deal damage, you may spend 4 boost points. You gain the knowledge of all of their boosts and abilities. You gain one of them for the rest of combat.]",
        "desc": "4 BP: on hit, learn all enemy boosts/abilities; copy one for rest of combat."
      },
      {
        "mote": "Grisha",
        "name": "It Doesn't Come Back",
        "details": "Gain the following Boost: [Kill Connection: When you hit an enemy with an attack and deal damage, you may spend 4 boost points. You gain the knowledge of all of their boosts and abilities. Select an ability or boost and they lose it for the rest of combat.]",
        "desc": "4 BP: on hit, steal an ability/boost from enemy; they lose it."
      },
      {
        "mote": "Grisha",
        "name": "Swallow",
        "details": "After using a boost from the Grisha mote as a part of an attack, or killing an enemy, regain Spi/2 HP.",
        "desc": "After Grisha boost or kill, heal Spirit/2 HP."
      },
      {
        "mote": "Grisha",
        "name": "Ruin Casting",
        "details": "Gain Spirit Mana (this increases if you gain spirit). Gain access to one of the following aspects of magic: Shadow, Void, Elemental. Also, learn 3 spells.",
        "desc": "Spirit Mana; choose Shadow/Void/Elemental; learn 3 spells."
      },
      {
        "mote": "Grisha",
        "name": "Ruin Craft",
        "details": "Learn the following Enhancement: When you hit enemies, you may ignore their DR. If the creator of this item is wielding it, when you hit someone you reduce their grit by 2 in addition.",
        "desc": "Learn the Ruin Craft."
      },
      {
        "mote": "Anavani",
        "name": "I Shine",
        "details": "Gain the following Boost: [{C} Shine: At the start of your turn, you may spend X Boost Points. Until the start of your next turn, all enemies within X blocks have -X to hit].",
        "desc": "X BP start: enemies within X blocks get \u2013X to hit until next turn."
      },
      {
        "mote": "Anavani",
        "name": "Commandment",
        "details": "Gain +3 Strength and when you hit an enemy with an attack, you may move them 1 block.",
        "desc": "+3 STR; push enemy 1 block on hit."
      },
      {
        "mote": "Anavani",
        "name": "Not A Chance",
        "details": "Gain +3 Spirit and once per round when you would be moved by an enemy, you are not.",
        "desc": "+3 Spirit; once/round ignore forced movement."
      },
      {
        "mote": "Anavani",
        "name": "Master of All",
        "details": "Gain 4x (Your Second Lowest) Stat Max BP, and 6x (Your Second Lowest) HP.",
        "desc": "Extra Max BP = 4\u00d7 second-lowest stat; extra HP = 6\u00d7 second-lowest stat."
      },
      {
        "mote": "Anavani",
        "name": "Build Up",
        "details": "Gain 1 Grit, Strength, Agility and Spirit. In addition, once per round when you hit, gain a +1 to an attribute of your choice for the rest of the combat.",
        "desc": "+1 to all stats; once/round on hit, +1 to any attribute (permanent for combat)."
      },
      {
        "mote": "Anavani",
        "name": "Star Power",
        "details": "Gain the following Boost: [Burst of Speed: At the end of your turn, you may spend 1 boost point to gain a movement or minor action, and may spend 3 boost points to gain a major action. This can only be done once per round.]",
        "desc": "1 BP: +move/minor at end of turn; 3 BP: +major; once/round."
      },
      {
        "mote": "Anavani",
        "name": "Glow",
        "details": "As a minor action, you may regain (Spirit/2) boost points, rounding up.",
        "desc": "Minor: regain Spirit/2 BP (rounded up)."
      },
      {
        "mote": "Anavani",
        "name": "Light It Up",
        "details": "Allies within 6 blocks of you (including yourself) gain +(Your Second Lowest Attribute) to damage from attacks.",
        "desc": "Allies within 6 add your second-lowest attribute to attack damage."
      },
      {
        "mote": "Anavani",
        "name": "Nova",
        "details": "Gain the following Boost: [Nova: When you hit an enemy you may spend 4 boost points and do an additional amount of damage equal to Strength+Spirit]",
        "desc": "4 BP on hit: deal +STR+SPI damage."
      },
      {
        "mote": "Anavani",
        "name": "Ascend",
        "details": "When you take a minor action, you may appear anywhere within 5 blocks of your current location.",
        "desc": "Minor: teleport within 5 blocks."
      },
      {
        "mote": "Anavani",
        "name": "Too High",
        "details": "Gain the following Boost: [Rise: When you are hit by a melee attack, spend 4 Boost Points to make it glance, and you may take a move action after the attack resolves which cannot be reacted to.]",
        "desc": "4 BP on melee hit: make it glance; free move after (unreactable)."
      },
      {
        "mote": "Anavani",
        "name": "Ascendance Casting",
        "details": "Gain Spirit Mana (this increases if you gain Spirit). Gain access to one of the following aspects of magic: Elemental, Astral, Arcane. Also, learn 3 spells.",
        "desc": "Spirit Mana; choose Elemental/Astral/Arcane; learn 3 spells."
      },
      {
        "mote": "Anavani",
        "name": "Ascendance Craft",
        "details": "Learn the following Enhancement: Hostile creatures within 15 blocks move at 1/2 speed. If the creator of this item is wielding it, in addition to the above effect, enemies within 6 blocks reduce their Agility by half (rounding up, minimum of 1).",
        "desc": "Learn the Ascendance Craft."
      },
      {
        "mote": "Kative",
        "name": "Divine Craftsman",
        "details": "When you craft an item, instead of having only one Add-On, you may have 4. You may select any Add-Ons, but must select three to be \u201cExtra Add-Ons\u201d. When someone other than you is wielding this item, they do not benefit from Extra Add-Ons. You may only benefit from 3 of these Extra Add-Ons per combat. Each Add-On must be different, but they stack with non-Extra Add-Ons.",
        "desc": "Craft items with up to 4 Add-Ons; only you benefit from extras (max 3/combat)."
      },
      {
        "mote": "Kative",
        "name": "Weapon Improvement",
        "details": "At the beginning of each combat, you may give all allies +Spirit/4 to hit or to damage from attacks, which lasts for the entire combat.",
        "desc": "At combat start, buff allies with +Spirit/4 to hit or damage."
      },
      {
        "mote": "Kative",
        "name": "Soul Stone",
        "details": "You have 10 \u2018Stone BP.\u2019 You may spend Stone BP instead of BP whenever you would spend BP. Your Stone BP is set to 10 at the start of each of your turns.",
        "desc": "10 Stone BP each turn; can spend instead of BP."
      },
      {
        "mote": "Kative",
        "name": "Bottle Spell",
        "details": "Gain the following Boost: [Lightning in a Bottle: When you take the cast action with a spell, you may spend a number of boost points equal to (the spell\u2019s mana cost)/3. In addition to the effect of the spell, gain the spell as a potion that you can use whenever you would normally use a potion. The potion becomes permanently inert at the end of combat. You may use this potion even if you have already drank 2 potions in this combat.]",
        "desc": "Spend (mana cost)/3 BP: store cast spell as potion usable later in combat."
      },
      {
        "mote": "Kative",
        "name": "Tinker",
        "details": "Gain the following Boost: [{C} Let Me Sharpen That For You: When you move next to an ally or an ally moves next to you, you may spend 1 boost point and choose a weapon or natural attack of that ally. That attack or weapon deals 2 additional damage for the rest of combat.]",
        "desc": "1 BP when adjacent to ally: buff their weapon/attack +2 damage for combat."
      },
      {
        "mote": "Kative",
        "name": "Perfectionist",
        "details": "On crit, double the damage dice.",
        "desc": "Crits roll double dice."
      },
      {
        "mote": "Kative",
        "name": "Appropriate",
        "details": "When using an item enhanced by a Mote Craft ability, you may treat yourself as the creator. You may only use this on one item at a time.",
        "desc": "Use someone else\u2019s crafted item as if you made it (1 item at a time)."
      },
      {
        "mote": "Kative",
        "name": "Mini-Me",
        "details": "Create a level 1 character with the same motes and no racial bonuses. At the start of combat or as a Major action on your turn, you may turn an enhanced item you have equipped into that character. They are summoned in adjacency and act on your turn, and have all of the benefits of that enhanced item. You regain the item at the end of combat. You may only create one mini-me per combat.",
        "desc": "Transform enhanced item into lvl 1 copy of you for combat; 1/combat."
      },
      {
        "mote": "Kative",
        "name": "Clay Army",
        "details": "Create a level 1 character sheet with no motes or race called a \u201cGolem\u201d. Gain the following Boost: [Makeshift Golem: After taking a movement action, you may spend 2 boost points to spawn a \u201cGolem\u201d in adjacency. The golem acts during your turn. You may only have 4 such golems at once. If more than 4 would exist, select one to be destroyed. If you are removed from combat, they stop taking actions and become blocking terrain.]",
        "desc": "2 BP after moving: summon golem (max 4). They block if you\u2019re gone."
      },
      {
        "mote": "Kative",
        "name": "Adaptive Armor",
        "details": "When you take damage from an enemy, gain 2 \u201cAdaptive\u201d and note the enemy that did the damage. For the rest of combat, whenever you take damage from that source, you may gain \u201cAdaptive\u201d DR for the rest of turn. You may only gain DR once per turn in this way.",
        "desc": "On damage: mark source, gain +2 Adaptive DR vs them (once/turn)."
      },
      {
        "mote": "Kative",
        "name": "Artifice Casting",
        "details": "Gain Spirit Mana (this increases if you gain spirit). Gain access to one of the following aspects of magic: Astral, Runic, Arcane. Also, learn 3 spells.",
        "desc": "Spirit Mana; choose Astral/Runic/Arcane; learn 3 spells."
      },
      {
        "mote": "Kative",
        "name": "Gizmos",
        "details": "Gain the following Boost: [Throw Gizmo: At the start of your turn, you may spend X boost points and select an option from the following table with a \u2018Boost Points\u2019 characteristic of X or less.]\nBoost Points\nName\nOutcome\n1\nPortable Wall\nCreate a 1 block long by 4 blocks wide wall that cannot be seen through or moved over, with at least one block of that wall being within 8 blocks. This has 4xSpirit HP.\n2\nMurder Wall\nCreate a 1 block long by 4 blocks wide wall that can be seen through by allies only (they can also direct attacks through the wall), with at least one block of that wall being within 8 blocks. This has 3xSpirit HP.\n2\nBlast Rock\nDestroy an obstacle that was placed in this combat.\n2\nConfusion Gas\nSelect an unoccupied block within 8 blocks. It cannot be moved through and no one adjacent to that block can take the attack action.",
        "desc": "Spend X BP: deploy a gizmo (wall, blast, or gas) depending on choice."
      },
      {
        "mote": "Kative",
        "name": "Artifice Craft",
        "details": "Learn the following Enhancement: When creating this item, you may add any other Mote Craft enhancement to this item, without the text which empowers the creator of the item. If the creator of this item is wielding it, you may add a second Mote Craft enhancement in the same way as the first without counting against maximum enhancements on this item or taking an additional downtime.",
        "desc": "Learn the Artifice Craft."
      },
      {
        "mote": "Morae",
        "name": "Turning The Wheel",
        "details": "Gain the following Boost: [Sever the Thread: Spend 4 boost points when an enemy declares an attack against you. The attack is nullified.]",
        "desc": "4 BP: cancel an attack against you."
      },
      {
        "mote": "Morae",
        "name": "Unyielding",
        "details": "Gain +3 Grit and the first time each combat you would die, you instead live with 1 HP. This cannot be used to reduce self inflicted damage.",
        "desc": "+3 Grit; first death each combat becomes 1 HP."
      },
      {
        "mote": "Morae",
        "name": "All Seeing Eyes",
        "details": "Gain +3 Spirit and at the start of your turn select one enemy, you know how much HP it has.",
        "desc": "+3 Spirit; know an enemy\u2019s HP each turn."
      },
      {
        "mote": "Morae",
        "name": "Doomed From The Start",
        "details": "Gain +4 Damage Resistance and whenever you take damage which ignores Damage Resistance, gain 1 BP.",
        "desc": "+4 DR; when ignoring DR damage is taken, gain 1 BP."
      },
      {
        "mote": "Morae",
        "name": "A Lone Lamb",
        "details": "Gain the following Boost: [{C} Sacrifice: When you take a minor action, you may spend X boost points to enrage any enemy or number of enemies in an X block radius. They take X damage when they attack anyone but you until you are at 0 HP for the rest of the combat.]",
        "desc": "X BP minor: enemies in radius take X damage if attacking others (until you drop)."
      },
      {
        "mote": "Morae",
        "name": "Martyr",
        "details": "When you cast a spell, you may spend HP instead of mana at a rate of 2 HP to 1 mana.",
        "desc": "Cast spells with HP (2 HP = 1 mana)."
      },
      {
        "mote": "Morae",
        "name": "Avenged",
        "details": "Gain the following Boost: [{C} Mark for Death: When you take damage, you may spend 2 boost points. The source of that damage takes an additional amount of damage equal to your Spirit whenever they are targeted by you or your allies with attacks for the rest of combat.]",
        "desc": "2 BP: mark damage source; they take +Spirit damage whenever attacked."
      },
      {
        "mote": "Morae",
        "name": "Born to Die",
        "details": "When you land a critical hit in melee range, the target cannot willingly move out of your melee range and must target you with all actions if possible until it is no longer in your melee range until the end of its next turn.",
        "desc": "On melee crit: enemy is forced to stay and target you until next turn."
      },
      {
        "mote": "Morae",
        "name": "Prediction",
        "details": "When you land a critical hit, declare an action. The target takes (Your Spirit) damage each time they take that action until the start of your next turn.",
        "desc": "On crit: declare action; target takes Spirit damage each time they use it until your next turn."
      },
      {
        "mote": "Morae",
        "name": "Bonded by Unseen Threads",
        "details": "Gain the following Boost: [{C} Link: When you target an enemy with an attack or cast action, you may spend 3 boost points. The target is \u2018linked.\u2019 Every time you take damage, all creatures \u2018linked\u2019 by you take 1/2 of that damage as well.]",
        "desc": "3 BP: link enemy; they take \u00bd of damage you take."
      },
      {
        "mote": "Morae",
        "name": "Sever Fate",
        "details": "On Crit, reduce enemy Max BP and BP by your Strength.",
        "desc": "On crit: enemy loses STR BP/Max BP."
      },
      {
        "mote": "Morae",
        "name": "Fate Casting",
        "details": "Gain Spirit Mana (this increases if you gain spirit). Gain access to one of the following aspects of magic: Wild, Divination, Soul. Also, learn 3 spells.",
        "desc": "Spirit Mana; choose Wild/Divination/Soul; learn 3 spells."
      },
      {
        "mote": "Morae",
        "name": "Fate Craft",
        "details": "Learn the following Enhancement: If you would hit with an attack, you instead crit. If the creator of this item is wielding it, then if they would glance, they instead hit once per round.",
        "desc": "Learn the Fate Craft."
      }

      ];

  /**
   * Initialize abilities data and organize by mote.
   */
  function initializeAbilitiesData() {
    // Organize abilities by mote
    abilitiesByMote = {"": [{"name": "", "desc": "", "details": ""}]};
    
    abilitiesData.forEach(ability => {
      const moteName = ability.mote;
      if (!abilitiesByMote[moteName]) {
        abilitiesByMote[moteName] = [];
      }
      abilitiesByMote[moteName].push({
        name: ability.name,
        desc: ability.desc,
        details: ability.details
      });
    });
    
    // Populate MOTE_OPTIONS with unique mote names
    const uniqueMotes = [...new Set(abilitiesData.map(ability => ability.mote))];
    MOTE_OPTIONS = [""].concat(uniqueMotes.sort());
    
    console.log('Abilities initialized successfully:', abilitiesByMote);
    console.log('Mote options:', MOTE_OPTIONS);
  }

  /**
   * Options shown in each Mote selector. Will be populated from JSON data.
   */
  let MOTE_OPTIONS = [""];

  /** How many ability slots to render under each Mote. */
  const ABILITIES_PER_MOTE = 6;

  /** Get the CSS theme class for a given mote name. */
  function getMoteThemeClass(moteName) {
    if (!moteName) return 'mote-theme-default';
    return `mote-theme-${moteName.toLowerCase()}`;
  }

  /** Get the CSS input theme class for a given mote name. */
  function getMoteInputThemeClass(moteName) {
    if (!moteName) return 'mote-input-default';
    return `mote-input-${moteName.toLowerCase()}`;
  }

  /** How many inventory rows to initialize. */
  const INVENTORY_ROWS = 12;

  /** How many enhancement rows to initialize. */
  const ENHANCEMENT_ROWS = 10;

  // =============================
  // Small DOM Utilities
  // =============================

  /** Create an element with optional className and innerHTML. */
  const el = (tag, cls = "", html = "") => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html) n.innerHTML = html;
    return n;
  };

  /** Create a styled input element. */
  const input = (attrs = {}) => {
    const i = document.createElement("input");
    Object.assign(i, attrs);
    i.className = `${attrs.className || ""} cell rounded-lg px-1 py-1 text-xs w-12 focus:ring-2 focus:ring-cyan-300`;
    // Add maxlength for number inputs to limit to 3 digits
    if (i.type === "number") {
      i.maxLength = 3;
      i.max = 999;
    }
    return i;
  };

  /** Create a styled select element with given option labels. */
  const select = (opts = [], attrs = {}) => {
    const s = document.createElement("select");
    Object.assign(s, attrs);
    s.className = `${attrs.className || ""} cell rounded-lg px-1 py-1 text-xs focus:ring-2 focus:ring-cyan-300`;
    opts.forEach((o) => {
      const op = document.createElement("option");
      op.value = o;
      op.textContent = o;
      s.appendChild(op);
    });
    return s;
  };

  /** Create a styled textarea element. */
  const textarea = (attrs = {}) => {
    const t = document.createElement("textarea");
    Object.assign(t, attrs);
    t.rows = attrs.rows || 3;
    t.className = `${attrs.className || ""} cell rounded-lg px-2 py-2 w-full text-xs focus:ring-2 focus:ring-cyan-300`;
    return t;
  };

  // =============================
  // Section Builders
  // =============================

  /** Build the core attributes table body. */
  function buildCoreAttributes(tbody) {
    CORE_ATTRS.forEach((label) => {
      const tr = el("tr", "border-t");
      tr.appendChild(el("td", "py-2 pr-2 font-medium", label));

      const base = input({ type: "number", value: 0, min: 0 });
      const mod = input({ type: "number", value: 0 });
      const temp = input({ type: "number", value: 0 });
      const level = input({ type: "number", value: 0 });
      const total = input({ type: "number", value: 0, readOnly: true });

      const recalc = () => {
        total.value = Number(base.value || 0) + Number(mod.value || 0) + Number(temp.value || 0) + Number(level.value || 0);
      };
      [base, mod, temp, level].forEach((i) => i.addEventListener("input", recalc));
      recalc();

      [base, mod, temp, level, total].forEach((ctrl) => {
        const td = el("td", "py-1 pr-1");
        td.appendChild(ctrl);
        tr.appendChild(td);
      });

      tbody.appendChild(tr);
    });
  }

  /** Build the calculated attributes table body. */
  function buildCalculatedAttributes(tbody) {
    CALC_ATTRS.forEach((def) => {
      const tr = el("tr", "border-t align-middle");
      tr.appendChild(el("td", "py-2 pr-2 font-medium", def.key));

      // Check if this attribute has a calculated base value
      let base;
      if (def.key === "Max HP") {
        base = input({ type: "number", value: 0, readOnly: true, className: "bg-gray-800/50" });
      } else if (def.key === "BP") {
        base = input({ type: "number", value: 0, readOnly: true, className: "bg-gray-800/50" });
      } else if (def.key === "AC") {
        base = input({ type: "number", value: 0, readOnly: true, className: "bg-gray-800/50" });
      } else if (def.key === "Speed") {
        base = input({ type: "number", value: 0, readOnly: true, className: "bg-gray-800/50" });
      } else {
        base = input({ type: "number", value: 0 });
      }
      
      const mod = input({ type: "number", value: 0 });
      const temp = input({ type: "number", value: 0 });
      const mult = input({ type: "number", value: 1, step: "0.01", max: 9.99, className: "w-14" });
      const end = input({ type: "number", value: 0, readOnly: true });

      const extraTd = el("td", "py-1 pr-1");
      if (def.extra === "HP") {
        const hpNow = input({ type: "number", value: 0, placeholder: "HP", className: "w-12" });
        const currentLabel = el("div", "text-[10px] uppercase tracking-wider subtle", "Current");
        const hpWrap = el("div", "");
        hpWrap.appendChild(hpNow);
        hpWrap.appendChild(currentLabel);
        extraTd.appendChild(hpWrap);
      } else if (def.extra === "Current") {
        const currentValue = input({ type: "number", value: 0, placeholder: def.key, className: "w-12" });
        const currentLabel = el("div", "text-[10px] uppercase tracking-wider subtle", "Current");
        const currentWrap = el("div", "");
        currentWrap.appendChild(currentValue);
        currentWrap.appendChild(currentLabel);
        extraTd.appendChild(currentWrap);
      }

      const recalc = () => {
        // Calculate base values for specific attributes
        if (def.key === "Max HP") {
          // Base HP = 6 × Grit Total + 30
          const gritRow = document.querySelector('#coreAttributes tr:nth-child(3)'); // Grit is 3rd core attribute
          const gritTotal = gritRow ? gritRow.querySelectorAll('input')[4].value || 0 : 0; // Total is 5th input (after adding Level)
          base.value = 6 * Number(gritTotal) + 30;
        } else if (def.key === "BP") {
          // Base BP = 2 × Spirit Total + 2
          const spiritRow = document.querySelector('#coreAttributes tr:nth-child(4)'); // Spirit is 4th core attribute
          const spiritTotal = spiritRow ? spiritRow.querySelectorAll('input')[4].value || 0 : 0; // Total is 5th input (after adding Level)
          base.value = 2 * Number(spiritTotal) + 2;
        } else if (def.key === "AC") {
          // Base AC = 10 + Agility Total
          const agilityRow = document.querySelector('#coreAttributes tr:nth-child(2)'); // Agility is 2nd core attribute
          const agilityTotal = agilityRow ? agilityRow.querySelectorAll('input')[4].value || 0 : 0; // Total is 5th input (after adding Level)
          base.value = 10 + Number(agilityTotal);
        } else if (def.key === "Speed") {
          // Base Speed = Speed Total
          const speedRow = document.querySelector('#coreAttributes tr:nth-child(5)'); // Speed is 5th core attribute
          const speedTotal = speedRow ? speedRow.querySelectorAll('input')[4].value || 0 : 0; // Total is 5th input (after adding Level)
          base.value = Number(speedTotal);
        }
        
        const sum = Number(base.value || 0) + Number(mod.value || 0) + Number(temp.value || 0);
        const m = Number(mult.value || 1);
        end.value = Math.ceil(sum * m);
      };

      // Add event listeners
      [base, mod, temp, mult].forEach((i) => i.addEventListener("input", recalc));
      
      // For calculated base values, also listen to core attribute changes
      if (def.key === "Max HP" || def.key === "BP" || def.key === "AC" || def.key === "Speed") {
        // Listen for changes to core attributes
        const coreAttributes = document.querySelectorAll('#coreAttributes input');
        coreAttributes.forEach(input => {
          input.addEventListener('input', recalc);
        });
      }
      
      recalc();

      [base, mod, temp, mult, end].forEach((ctrl) => {
        const td = el("td", "py-1 pr-1");
        const ctrlWrap = el("div", "");
        ctrlWrap.appendChild(ctrl);
        // Add blank space to match the HP "Current" label
        const blankLabel = el("div", "text-[10px] uppercase tracking-wider subtle", " ");
        ctrlWrap.appendChild(blankLabel);
        td.appendChild(ctrlWrap);
        tr.appendChild(td);
      });

      tr.appendChild(extraTd);
      tbody.appendChild(tr);
    });
  }

  /** Build inventory rows. */
  function buildInventory(container, rows = INVENTORY_ROWS) {
    for (let i = 0; i < rows; i++) {
      const row = el("div", "grid grid-cols-5 gap-2");
      const name = input({ placeholder: "Name", className: "col-span-2" });
      const desc = textarea({ placeholder: "Description", rows: 2, className: "col-span-3" });
      row.appendChild(name);
      row.appendChild(desc);
      container.appendChild(row);
    }
  }

  /** Build a single Mote column with dropdown + dynamic ability slots. */
  function buildMote(container) {
    container.appendChild(el("h3", "text-lg font-semibold mb-3", "Mote"));

    const moteSel = select(MOTE_OPTIONS);
    moteSel.classList.add("w-full");
    container.appendChild(moteSel);

    const abilitiesWrap = el("div", "mt-3 space-y-3");
    abilitiesWrap.id = container.id + "-abilities";
    container.appendChild(abilitiesWrap);

    // Add initial ability (motes must have at least one)
    addMoteAbility(abilitiesWrap, moteSel);

    // Add button for more abilities
    const addBtn = el("button", "mt-3 rounded-xl px-4 py-2.5 bg-cyan-500/20 border border-cyan-300/30 hover:bg-cyan-500/30 text-sm");
    addBtn.textContent = "Add Ability";
    addBtn.onclick = () => addMoteAbility(abilitiesWrap, moteSel);
    container.appendChild(addBtn);

    // Populate ability dropdowns based on chosen mote.
    function repopulate() {
      const list = abilitiesByMote[moteSel.value] || [{"name": "", "desc": "", "details": ""}];
      const abilitySelects = abilitiesWrap.querySelectorAll("select");
      const abilityDescs = abilitiesWrap.querySelectorAll("textarea");
      
      // Update theme for all ability cards (only target ability card divs, not all divs)
      const abilityCards = abilitiesWrap.querySelectorAll("div.pt-4.pb-8.px-4.rounded-xl.border.relative");
      const newThemeClass = getMoteThemeClass(moteSel.value);
      const newInputThemeClass = getMoteInputThemeClass(moteSel.value);
      
      // Remove all existing mote theme classes
      abilityCards.forEach(card => {
        card.classList.remove(...Array.from(card.classList).filter(cls => cls.startsWith('mote-theme-')));
        card.classList.add(newThemeClass);
        
        // Update input/textarea themes
        const select = card.querySelector('select');
        const textarea = card.querySelector('textarea');
        if (select) {
          select.classList.remove(...Array.from(select.classList).filter(cls => cls.startsWith('mote-input-')));
          select.classList.add(newInputThemeClass);
        }
        if (textarea) {
          // Remove any mote-input classes from textarea - let it use parent container's .mote-theme-default textarea CSS rule
          textarea.classList.remove(...Array.from(textarea.classList).filter(cls => cls.startsWith('mote-input-')));
        }
      });
      
      abilitySelects.forEach((sel, index) => {
        sel.innerHTML = "";
        list.forEach((ability) => {
          const op = document.createElement("option");
          op.value = ability.name;
          op.textContent = ability.name;
          op.dataset.desc = ability.desc; // Store description in data attribute
          op.dataset.details = ability.details; // Store details in data attribute
          sel.appendChild(op);
        });
        
        // Update corresponding description
        if (abilityDescs[index]) {
          abilityDescs[index].value = list[0].desc || "";
          // Trigger auto-resize for textarea
          abilityDescs[index].dispatchEvent(new Event('input'));
        }
        
        // Reset info button state
        const infoBtn = sel.parentElement.querySelector(".info-btn");
        if (infoBtn) {
          infoBtn.classList.remove("bg-cyan-500", "text-white");
          infoBtn.classList.add("bg-gray-600", "text-gray-300");
        }
      });
    }

    moteSel.addEventListener("change", () => {
      repopulate();
      validateMoteSelections();
      validateAbilitySelections();
    });
    repopulate();
  }

  /** Add a new ability to a mote. */
  function addMoteAbility(abilitiesWrap, moteSel) {
    const abilityCard = el("div", "pt-4 pb-8 px-4 rounded-xl border relative");
    // Apply mote theme
    const themeClass = getMoteThemeClass(moteSel.value);
    abilityCard.classList.add(themeClass);
    
    // Create ability selector
    const abilitySel = select([""], { className: "w-full mb-4 text-white" });
    // Apply mote input theme
    const inputThemeClass = getMoteInputThemeClass(moteSel.value);
    abilitySel.classList.add(inputThemeClass);
    
    // Create delete button (only if there's more than one ability) - positioned at bottom right
    const deleteBtn = el("button", "absolute bottom-2 right-2 w-7 h-7 flex items-center justify-center rounded-full bg-red-500/20 border border-red-300/30 hover:bg-red-500/30 text-red-300 hover:text-red-200 transition-colors");
    deleteBtn.innerHTML = "×";
    deleteBtn.title = "Delete ability";
    deleteBtn.onclick = () => {
      // Only allow deletion if there's more than one ability
      if (abilitiesWrap.children.length > 1) {
        abilityCard.remove();
        updateDeleteButtons(abilitiesWrap);
        validateAbilitySelections();
      }
    };
    
    // Create description container
    const descContainer = el("div", "relative");
    const desc = textarea({ placeholder: "Ability Description", rows: 2, readOnly: true, className: "w-full resize-none overflow-hidden text-white bg-transparent" });
    // Don't apply mote input theme to textarea - let it use the parent container's .mote-theme-default textarea CSS rule
    
    // Create info button (positioned within the card, not the textarea)
    const infoBtn = el("button", "absolute bottom-2 left-2 w-6 h-6 rounded-full bg-gray-600 text-gray-300 hover:bg-gray-500 flex items-center justify-center text-xs font-bold info-btn");
    infoBtn.innerHTML = "i";
    infoBtn.title = "Toggle detailed description";
    
    // Function to auto-resize textarea based on content
    function autoResizeTextarea() {
      desc.style.height = 'auto';
      const scrollHeight = desc.scrollHeight;
      const minHeight = 48; // 2 rows worth
      const maxHeight = 200; // Maximum height before scrolling
      desc.style.height = Math.min(Math.max(scrollHeight, minHeight), maxHeight) + 'px';
    }
    
    // Add toggle functionality
    let isDetailedMode = false;
    infoBtn.onclick = () => {
      const selectedOption = abilitySel.options[abilitySel.selectedIndex];
      if (selectedOption && selectedOption.dataset.details) {
        isDetailedMode = !isDetailedMode;
        if (isDetailedMode) {
          desc.value = selectedOption.dataset.details;
          infoBtn.classList.remove("bg-gray-600", "text-gray-300");
          infoBtn.classList.add("bg-cyan-500", "text-white");
        } else {
          desc.value = selectedOption.dataset.desc || "";
          infoBtn.classList.remove("bg-cyan-500", "text-white");
          infoBtn.classList.add("bg-gray-600", "text-gray-300");
        }
        // Auto-resize after content change
        setTimeout(autoResizeTextarea, 10);
      }
    };
    
    // Populate the selector based on current mote selection
    const list = abilitiesByMote[moteSel.value] || [{"name": "", "desc": "", "details": ""}];
    list.forEach((ability) => {
      const op = document.createElement("option");
      op.value = ability.name;
      op.textContent = ability.name;
      op.dataset.desc = ability.desc;
      op.dataset.details = ability.details;
      abilitySel.appendChild(op);
    });
    
    // Add event listener to update description when ability is selected
    abilitySel.addEventListener("change", () => {
      const selectedOption = abilitySel.options[abilitySel.selectedIndex];
      isDetailedMode = false; // Reset to basic description
      desc.value = selectedOption.dataset.desc || "";
      // Reset info button state
      infoBtn.classList.remove("bg-cyan-500", "text-white");
      infoBtn.classList.add("bg-gray-600", "text-gray-300");
        // Auto-resize after content change
        setTimeout(autoResizeTextarea, 10);
        // Validate selections after ability change
        validateAbilitySelections();
      });
    
    // Assemble description container
    descContainer.appendChild(desc);
    
    // Assemble the ability card
    abilityCard.appendChild(deleteBtn);
    abilityCard.appendChild(infoBtn);
    abilityCard.appendChild(abilitySel);
    abilityCard.appendChild(descContainer);
    abilitiesWrap.appendChild(abilityCard);
    
    // Update delete button visibility and validate selections
    updateDeleteButtons(abilitiesWrap);
    validateAbilitySelections();
  }

  /** Update delete button visibility based on number of abilities. */
  function updateDeleteButtons(abilitiesWrap) {
    const abilityCards = abilitiesWrap.querySelectorAll("div.pt-4.pb-8.px-4.rounded-xl.border.relative");
    abilityCards.forEach((card, index) => {
      const deleteBtn = card.querySelector("button");
      if (deleteBtn) {
        // Hide delete button if this is the only ability
        deleteBtn.style.display = abilityCards.length > 1 ? "flex" : "none";
      }
    });
  }

  /** Build Known Enhancements (start with one). */
  function buildEnhancements(container) {
    // Start with one enhancement (required minimum)
    addEnhancement();
  }

  /** Add a new enhancement when user clicks the button. */
  function addEnhancement() {
    const enhancements = document.getElementById("enhancements");
    const newEnhancement = document.createElement("div");
    newEnhancement.className = "p-3 rounded-xl border border-white/10 bg-white/5 relative";
    
    // Create delete button (only if there's more than one enhancement)
    const deleteBtn = el("button", "absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-full bg-red-500/20 border border-red-300/30 hover:bg-red-500/30 text-red-300 hover:text-red-200 transition-colors");
    deleteBtn.innerHTML = "×";
    deleteBtn.title = "Delete enhancement";
    deleteBtn.onclick = () => {
      // Only allow deletion if there's more than one enhancement
      if (enhancements.children.length > 1) {
        newEnhancement.remove();
        updateEnhancementDeleteButtons();
      }
    };
    
    // Create form fields in a grid layout with effect field taking more space
    const fieldsContainer = el("div", "grid grid-cols-6 gap-2 pr-8");
    
    const nameField = input({ placeholder: "Name", className: "w-full" });
    const costField = input({ type: "text", placeholder: "Cost", className: "w-full" });
    const itemField = input({ placeholder: "Item", className: "w-full" });
    const effectField = textarea({ placeholder: "Effect", rows: 1, className: "w-full resize-none overflow-hidden col-span-3" });
    
    // Function to auto-resize textarea based on content
    function autoResizeTextarea() {
      effectField.style.height = 'auto';
      const scrollHeight = effectField.scrollHeight;
      const minHeight = 40; // Single row height
      const maxHeight = 200; // Maximum height before scrolling
      effectField.style.height = Math.min(Math.max(scrollHeight, minHeight), maxHeight) + 'px';
    }
    
    // Add auto-resize functionality
    effectField.addEventListener('input', autoResizeTextarea);
    effectField.addEventListener('paste', () => {
      // Small delay to allow paste content to be processed
      setTimeout(autoResizeTextarea, 10);
    });
    
    fieldsContainer.appendChild(nameField);
    fieldsContainer.appendChild(costField);
    fieldsContainer.appendChild(itemField);
    fieldsContainer.appendChild(effectField);
    
    // Assemble the enhancement
    newEnhancement.appendChild(deleteBtn);
    newEnhancement.appendChild(fieldsContainer);
    enhancements.appendChild(newEnhancement);
    
    // Update delete button visibility
    updateEnhancementDeleteButtons();
  }

  /** Update enhancement delete button visibility based on number of enhancements. */
  function updateEnhancementDeleteButtons() {
    const enhancements = document.getElementById("enhancements");
    const enhancementCards = enhancements.querySelectorAll("div");
    enhancementCards.forEach((card) => {
      const deleteBtn = card.querySelector("button");
      if (deleteBtn) {
        // Hide delete button if this is the only enhancement
        deleteBtn.style.display = enhancementCards.length > 1 ? "flex" : "none";
      }
    });
  }

  /** Build Masteries (start with one). */
  function buildMasteries(container) {
    // Start with one mastery (required minimum)
    addMastery();
  }

  /** Add a new mastery when user clicks the button. */
  function addMastery() {
    const masteries = document.getElementById("masteries");
    const newMastery = document.createElement("div");
    newMastery.className = "p-3 rounded-xl border border-white/10 bg-white/5 relative";
    
    // Create delete button (only if there's more than one mastery)
    const deleteBtn = el("button", "absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-full bg-red-500/20 border border-red-300/30 hover:bg-red-500/30 text-red-300 hover:text-red-200 transition-colors");
    deleteBtn.innerHTML = "×";
    deleteBtn.title = "Delete mastery";
    deleteBtn.onclick = () => {
      // Only allow deletion if there's more than one mastery
      if (masteries.children.length > 1) {
        newMastery.remove();
        updateMasteryDeleteButtons();
      }
    };
    
    // Create form fields in a grid layout (only 2 columns: Name and Effect)
    const fieldsContainer = el("div", "grid grid-cols-2 gap-2 pr-8");
    
    const nameField = input({ placeholder: "Name", className: "w-full" });
    const effectField = input({ placeholder: "Effect", className: "w-full" });
    
    fieldsContainer.appendChild(nameField);
    fieldsContainer.appendChild(effectField);
    
    // Assemble the mastery
    newMastery.appendChild(deleteBtn);
    newMastery.appendChild(fieldsContainer);
    masteries.appendChild(newMastery);
    
    // Update delete button visibility
    updateMasteryDeleteButtons();
  }

  /** Update mastery delete button visibility based on number of masteries. */
  function updateMasteryDeleteButtons() {
    const masteries = document.getElementById("masteries");
    const masteryCards = masteries.querySelectorAll("div");
    masteryCards.forEach((card) => {
      const deleteBtn = card.querySelector("button");
      if (deleteBtn) {
        // Hide delete button if this is the only mastery
        deleteBtn.style.display = masteryCards.length > 1 ? "flex" : "none";
      }
    });
  }

  /** Build Mind Alterations rows (fixed at 3). */
  function buildMindAlterations(container) {
    for (let i = 0; i < 3; i++) {
      const row = el("div", "space-y-2");
      const name = input({ placeholder: "Name", className: "w-full" });
      const desc = textarea({ placeholder: "Description", rows: 3, className: "w-full" });
      row.appendChild(name);
      row.appendChild(desc);
      container.appendChild(row);
    }
  }

  /** Build Mind Breaks cards (start with one). */
  function buildMindBreaks(container) {
    // Start with one mind break (required minimum)
    addMindBreak();
  }

  // =============================
  // Export / Import Functions
  // =============================

  /** Export character data as a simple string format */
  function exportCharacter() {
    const data = {
      // Basic info
      name: document.getElementById("charName").value || "",
      level: document.getElementById("level").value || "",
      exp: document.getElementById("exp").value || "",
      race: document.getElementById("race").value || "",
      
      // Core attributes
      core: [],
      // Calculated attributes  
      calc: [],
      // Inventory items
      inventory: [],
      // Mote abilities
      motes: [],
      // Enhancements
      enhancements: [],
      // Masteries
      masteries: [],
      // Mastery value
      masteryValue: "",
      // Mind alterations
      mindAlterations: [],
      // Mind breaks
      mindBreaks: []
    };

    // Collect core attributes
    const coreRows = document.querySelectorAll('#coreAttributes tr');
    coreRows.forEach(row => {
      const inputs = row.querySelectorAll('input');
      if (inputs.length >= 5) {
        data.core.push({
          base: inputs[0].value || "",
          mod: inputs[1].value || "",
          temp: inputs[2].value || "",
          level: inputs[3].value || "",
          total: inputs[4].value || ""
        });
      }
    });

    // Collect calculated attributes
    const calcRows = document.querySelectorAll('#calcAttributes tr');
    calcRows.forEach(row => {
      const inputs = row.querySelectorAll('input');
      if (inputs.length >= 5) {
        const extraInput = row.querySelector('td:last-child input');
        data.calc.push({
          base: inputs[0].value || "",
          mod: inputs[1].value || "",
          temp: inputs[2].value || "",
          mult: inputs[3].value || "",
          end: inputs[4].value || "",
          extra: extraInput ? extraInput.value || "" : ""
        });
      }
    });

    // Collect inventory items
    const inventoryItems = document.querySelectorAll('#inventory > div');
    inventoryItems.forEach(item => {
      const inputs = item.querySelectorAll('input, textarea');
      if (inputs.length >= 2) {
        data.inventory.push({
          name: inputs[0].value || "",
          desc: inputs[1].value || ""
        });
      }
    });

    // Collect mote abilities - check all mote containers that exist
    for (let moteNum = 1; moteNum <= 10; moteNum++) { // Check up to 10 motes to be safe
      const moteContainer = document.getElementById(`mote-${moteNum}`);
      if (moteContainer) {
        const moteSelect = moteContainer.querySelector('select');
        // Find the abilities wrapper div (it has mt-3 class)
        const abilitiesWrap = moteContainer.querySelector('div.mt-3');
        // Select only ability cards that have both select and textarea elements
        const abilityCards = abilitiesWrap ? 
          Array.from(abilitiesWrap.children).filter(card => 
            card.querySelector('select') && card.querySelector('textarea')
          ) : [];
        const moteData = {
          mote: moteSelect ? moteSelect.value : "",
          abilities: []
        };
        
        abilityCards.forEach((card, index) => {
          const select = card.querySelector('select');
          const textarea = card.querySelector('textarea');
          console.log(`Mote ${moteNum}, Ability ${index}: select=${!!select}, textarea=${!!textarea}, ability="${select?.value || ''}", desc="${textarea?.value || ''}"`);
          if (select && textarea) {
            moteData.abilities.push({
              ability: select.value || "",
              desc: textarea.value || ""
            });
          } else {
            console.log(`Mote ${moteNum}, Ability ${index}: SKIPPED - missing select or textarea`);
          }
        });
        
        // Debug: log what we found
        console.log(`Mote ${moteNum}: Found ${abilityCards.length} ability cards, exported ${moteData.abilities.length} abilities`);
        
        data.motes.push(moteData);
      } else {
        break; // Stop if we hit a non-existent mote container
      }
    }

    // Collect enhancements
    const enhancementItems = document.querySelectorAll('#enhancements > div');
    enhancementItems.forEach(item => {
      const inputs = item.querySelectorAll('input, textarea');
      if (inputs.length >= 4) {
        data.enhancements.push({
          name: inputs[0].value || "",
          cost: inputs[1].value || "",
          item: inputs[2].value || "",
          effect: inputs[3].value || ""
        });
      }
    });

    // Collect masteries
    const masteryItems = document.querySelectorAll('#masteries > div');
    masteryItems.forEach(item => {
      const inputs = item.querySelectorAll('input');
      if (inputs.length >= 2) {
        data.masteries.push({
          name: inputs[0].value || "",
          effect: inputs[1].value || ""
        });
      }
    });

    // Collect mastery value
    data.masteryValue = document.getElementById("masteryValue").value || "";

    // Collect mind alterations
    const mindAlterationItems = document.querySelectorAll('#mindAlterations > div');
    mindAlterationItems.forEach(item => {
      const inputs = item.querySelectorAll('input, textarea');
      if (inputs.length >= 2) {
        data.mindAlterations.push({
          name: inputs[0].value || "",
          desc: inputs[1].value || ""
        });
      }
    });

    // Collect mind breaks
    const mindBreakItems = document.querySelectorAll('#mindBreaks > div');
    mindBreakItems.forEach(item => {
      const inputs = item.querySelectorAll('input, textarea');
      if (inputs.length >= 2) {
        data.mindBreaks.push({
          name: inputs[0].value || "",
          desc: inputs[1].value || ""
        });
      }
    });

    // Convert to string and show in text box
    const exportString = JSON.stringify(data);
    showExportTextBox(exportString);
  }

  /** Show export data in a copyable text box */
  function showExportTextBox(exportString) {
    // Remove any existing export box
    const existingBox = document.getElementById('exportTextBox');
    if (existingBox) {
      existingBox.remove();
    }

    // Create the export text box
    const exportBox = document.createElement('div');
    exportBox.id = 'exportTextBox';
    exportBox.className = 'fixed top-4 right-4 w-96 max-h-96 bg-gray-900 border border-cyan-300/30 rounded-xl p-4 z-50 shadow-2xl';
    
    exportBox.innerHTML = `
      <div class="flex justify-between items-center mb-3">
        <h3 class="text-cyan-300 font-semibold">Character Export Data</h3>
        <button id="closeExportBox" class="text-gray-400 hover:text-white transition-colors">×</button>
      </div>
      <textarea id="exportData" readonly class="w-full h-64 bg-gray-800 border border-gray-600 rounded p-2 text-xs font-mono text-white resize-none">${exportString}</textarea>
      <div class="mt-3 flex gap-2">
        <button id="copyExportData" class="px-3 py-1 bg-cyan-500/20 border border-cyan-300/30 rounded hover:bg-cyan-500/30 text-cyan-300 text-sm">Copy</button>
        <button id="closeExportBox2" class="px-3 py-1 bg-gray-500/20 border border-gray-300/30 rounded hover:bg-gray-500/30 text-gray-300 text-sm">Close</button>
      </div>
    `;

    document.body.appendChild(exportBox);

    // Add event listeners
    document.getElementById('closeExportBox').addEventListener('click', () => exportBox.remove());
    document.getElementById('closeExportBox2').addEventListener('click', () => exportBox.remove());
    document.getElementById('copyExportData').addEventListener('click', () => {
      const textarea = document.getElementById('exportData');
      textarea.select();
      document.execCommand('copy');
      // Show brief feedback
      const copyBtn = document.getElementById('copyExportData');
      const originalText = copyBtn.textContent;
      copyBtn.textContent = 'Copied!';
      copyBtn.classList.add('bg-green-500/20', 'border-green-300/30', 'text-green-300');
      copyBtn.classList.remove('bg-cyan-500/20', 'border-cyan-300/30', 'text-cyan-300');
      setTimeout(() => {
        copyBtn.textContent = originalText;
        copyBtn.classList.remove('bg-green-500/20', 'border-green-300/30', 'text-green-300');
        copyBtn.classList.add('bg-cyan-500/20', 'border-cyan-300/30', 'text-cyan-300');
      }, 1000);
    });

    // Close on escape key
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        exportBox.remove();
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);
  }

  /** Show import dialog with text box */
  function showImportDialog() {
    // Remove any existing import box
    const existingBox = document.getElementById('importTextBox');
    if (existingBox) {
      existingBox.remove();
    }

    // Create the import dialog
    const importBox = document.createElement('div');
    importBox.id = 'importTextBox';
    importBox.className = 'fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 bg-gray-900 border border-cyan-300/30 rounded-xl p-4 z-50 shadow-2xl';
    
    importBox.innerHTML = `
      <div class="flex justify-between items-center mb-3">
        <h3 class="text-cyan-300 font-semibold">Import Character Data</h3>
        <button id="closeImportBox" class="text-gray-400 hover:text-white transition-colors">×</button>
      </div>
      <p class="text-sm text-gray-300 mb-3">Paste your character data string below:</p>
      <textarea id="importData" placeholder="Paste character data here..." class="w-full h-40 bg-gray-800 border border-gray-600 rounded p-2 text-xs font-mono text-white resize-none"></textarea>
      <div class="mt-3 flex gap-2">
        <button id="importDataBtn" class="px-3 py-1 bg-cyan-500/20 border border-cyan-300/30 rounded hover:bg-cyan-500/30 text-cyan-300 text-sm">Import</button>
        <button id="closeImportBox2" class="px-3 py-1 bg-gray-500/20 border border-gray-300/30 rounded hover:bg-gray-500/30 text-gray-300 text-sm">Cancel</button>
      </div>
    `;

    document.body.appendChild(importBox);

    // Focus on textarea
    document.getElementById('importData').focus();

    // Add event listeners
    document.getElementById('closeImportBox').addEventListener('click', () => importBox.remove());
    document.getElementById('closeImportBox2').addEventListener('click', () => importBox.remove());
    document.getElementById('importDataBtn').addEventListener('click', async () => {
      const importString = document.getElementById('importData').value;
      if (importString) {
        importBox.remove();
        await importCharacterData(importString);
      }
    });

    // Import on Ctrl+Enter
    document.getElementById('importData').addEventListener('keydown', async (e) => {
      if (e.ctrlKey && e.key === 'Enter') {
        const importString = document.getElementById('importData').value;
        if (importString) {
          importBox.remove();
          await importCharacterData(importString);
        }
      }
    });

    // Close on escape key
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        importBox.remove();
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);
  }

  /** Import character data from a string */
  async function importCharacterData(importString) {

    try {
      const data = JSON.parse(importString);
      
      // Clear existing data first - ensure complete reset
      clearAllData();
      
      // Wait a moment for the reset to complete
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Import basic info
      document.getElementById("charName").value = data.name || "";
      document.getElementById("level").value = data.level || "";
      document.getElementById("exp").value = data.exp || "";
      document.getElementById("race").value = data.race || "";

      // Import core attributes
      if (data.core) {
        const coreRows = document.querySelectorAll('#coreAttributes tr');
        data.core.forEach((attr, i) => {
          if (coreRows[i]) {
            const inputs = coreRows[i].querySelectorAll('input');
            if (inputs.length >= 5) {
              inputs[0].value = attr.base || "";
              inputs[1].value = attr.mod || "";
              inputs[2].value = attr.temp || "";
              inputs[3].value = attr.level || "";
              inputs[4].value = attr.total || "";
            }
          }
        });
      }

      // Import calculated attributes
      if (data.calc) {
        const calcRows = document.querySelectorAll('#calcAttributes tr');
        data.calc.forEach((attr, i) => {
          if (calcRows[i]) {
            const inputs = calcRows[i].querySelectorAll('input');
            if (inputs.length >= 5) {
              inputs[0].value = attr.base || "";
              inputs[1].value = attr.mod || "";
              inputs[2].value = attr.temp || "";
              inputs[3].value = attr.mult || "";
              inputs[4].value = attr.end || "";
            }
            const extraInput = calcRows[i].querySelector('td:last-child input');
            if (extraInput) {
              extraInput.value = attr.extra || "";
            }
          }
        });
      }

      // Import inventory items
      if (data.inventory) {
        clearContainer('#inventory');
        data.inventory.forEach(item => {
          addInventoryItem();
          const lastItem = document.querySelector('#inventory > div:last-child');
          if (lastItem) {
            const inputs = lastItem.querySelectorAll('input, textarea');
            if (inputs.length >= 2) {
              inputs[0].value = item.name || "";
              inputs[1].value = item.desc || "";
              // Trigger auto-resize for textareas
              if (inputs[1].tagName === 'TEXTAREA') {
                inputs[1].dispatchEvent(new Event('input'));
              }
            }
          }
        });
      }

      // Import mote abilities
      if (data.motes) {
        data.motes.forEach((moteData, moteIndex) => {
          const moteNum = moteIndex + 1;
          const moteContainer = document.getElementById(`mote-${moteNum}`);
          if (moteContainer) {
            // Set mote selection first
            const moteSelect = moteContainer.querySelector('select');
            if (moteSelect) {
              moteSelect.value = moteData.mote || "";
            }
            
            // Clear existing abilities and add new ones
            setTimeout(() => {
              // Find the abilities wrapper div (it's the last div in the mote container)
              const abilitiesWrap = moteContainer.querySelector('div.mt-3');
              if (abilitiesWrap) {
                // Clear all existing ability cards
                abilitiesWrap.innerHTML = '';
                
                // Add each ability from the imported data as separate cards
                if (moteData.abilities && moteData.abilities.length > 0) {
                  // Add abilities one by one with small delays to ensure proper DOM structure
                  for (let i = 0; i < moteData.abilities.length; i++) {
                    setTimeout(() => {
                      addMoteAbility(abilitiesWrap, moteSelect);
                    }, i * 50); // Small delay between each ability
                  }
                  
                  // Wait for all abilities to be added, then populate them
                  setTimeout(() => {
                    populateImportedAbilities(abilitiesWrap, moteSelect, moteData.abilities);
                  }, moteData.abilities.length * 50 + 100);
                } else {
                  // Add minimum required ability if none exist
                  addMoteAbility(abilitiesWrap, moteSelect);
                }
              }
            }, 100);
          }
        });
      }

      // Import enhancements
      if (data.enhancements) {
        clearContainer('#enhancements');
        data.enhancements.forEach(enhancement => {
          addEnhancement();
          const lastEnhancement = document.querySelector('#enhancements > div:last-child');
          if (lastEnhancement) {
            const inputs = lastEnhancement.querySelectorAll('input, textarea');
            if (inputs.length >= 4) {
              inputs[0].value = enhancement.name || "";
              inputs[1].value = enhancement.cost || "";
              inputs[2].value = enhancement.item || "";
              inputs[3].value = enhancement.effect || "";
              // Trigger auto-resize for textareas
              inputs.forEach(input => {
                if (input.tagName === 'TEXTAREA') {
                  input.dispatchEvent(new Event('input'));
                }
              });
            }
          }
        });
      }

      // Import masteries
      if (data.masteries) {
        clearContainer('#masteries');
        data.masteries.forEach(mastery => {
          addMastery();
          const lastMastery = document.querySelector('#masteries > div:last-child');
          if (lastMastery) {
            const inputs = lastMastery.querySelectorAll('input');
            if (inputs.length >= 2) {
              inputs[0].value = mastery.name || "";
              inputs[1].value = mastery.effect || "";
            }
          }
        });
      }

      // Import mastery value
      if (data.masteryValue !== undefined) {
        document.getElementById("masteryValue").value = data.masteryValue || "";
      }

      // Import mind alterations
      if (data.mindAlterations) {
        clearContainer('#mindAlterations');
        data.mindAlterations.forEach(alteration => {
          addMindAlteration();
          const lastAlteration = document.querySelector('#mindAlterations > div:last-child');
          if (lastAlteration) {
            const inputs = lastAlteration.querySelectorAll('input, textarea');
            if (inputs.length >= 2) {
              inputs[0].value = alteration.name || "";
              inputs[1].value = alteration.desc || "";
              // Trigger auto-resize for textareas
              inputs.forEach(input => {
                if (input.tagName === 'TEXTAREA') {
                  input.dispatchEvent(new Event('input'));
                }
              });
            }
          }
        });
      }

      // Import mind breaks
      if (data.mindBreaks) {
        clearContainer('#mindBreaks');
        data.mindBreaks.forEach(mindBreak => {
          addMindBreak();
          const lastMindBreak = document.querySelector('#mindBreaks > div:last-child');
          if (lastMindBreak) {
            const inputs = lastMindBreak.querySelectorAll('input, textarea');
            if (inputs.length >= 2) {
              inputs[0].value = mindBreak.name || "";
              inputs[1].value = mindBreak.desc || "";
              // Trigger auto-resize for textareas
              inputs.forEach(input => {
                if (input.tagName === 'TEXTAREA') {
                  input.dispatchEvent(new Event('input'));
                }
              });
            }
          }
        });
      }

      alert("Character imported successfully!");
      
    } catch (error) {
      alert("Error importing character data. Please check the format and try again.");
      console.error("Import error:", error);
    }
  }

  /** Clear all data from the character sheet */
  function clearAllData() {
    // Clear basic info
    document.getElementById("charName").value = "";
    document.getElementById("level").value = "";
    document.getElementById("exp").value = "";
    document.getElementById("race").value = "";
    
    // Clear all input fields
    document.querySelectorAll('input, textarea').forEach(input => {
      if (!input.readOnly) {
        input.value = "";
      }
    });
    
    // Clear dynamic containers
    clearContainer('#inventory');
    clearContainer('#enhancements');
    clearContainer('#masteries');
    clearContainer('#mindAlterations');
    clearContainer('#mindBreaks');
    
    // Reset mote abilities - check all mote containers that exist
    for (let moteNum = 1; moteNum <= 10; moteNum++) { // Check up to 10 motes to be safe
      const moteContainer = document.getElementById(`mote-${moteNum}`);
      if (moteContainer) {
        // Clear abilities wrapper
        const abilitiesWrap = moteContainer.querySelector('div.mt-3');
        if (abilitiesWrap) {
          abilitiesWrap.innerHTML = '';
        }
        
        // Reset mote selection
        const moteSelect = moteContainer.querySelector('select');
        if (moteSelect) {
          moteSelect.value = "";
        }
        
        // Add back the minimum required ability
        if (abilitiesWrap) {
          addMoteAbility(abilitiesWrap, moteSelect);
        }
      } else {
        break; // Stop if we hit a non-existent mote container
      }
    }
  }

  /** Clear all children from a container */
  function clearContainer(selector) {
    const container = document.querySelector(selector);
    if (container) {
      container.innerHTML = "";
    }
  }

  /** Populate imported abilities with their data */
  function populateImportedAbilities(abilitiesWrap, moteSelect, abilitiesData) {
    const list = abilitiesByMote[moteSelect.value] || [{"name": "", "desc": "", "details": ""}];
    const abilitySelects = abilitiesWrap.querySelectorAll("select");
    const abilityDescs = abilitiesWrap.querySelectorAll("textarea");
    
    abilitySelects.forEach((sel, index) => {
      sel.innerHTML = "";
      list.forEach((ability) => {
        const op = document.createElement("option");
        op.value = ability.name;
        op.textContent = ability.name;
        op.dataset.desc = ability.desc;
        op.dataset.details = ability.details;
        sel.appendChild(op);
      });
      
      // Set the ability selection from imported data
      if (abilitiesData && abilitiesData[index]) {
        sel.value = abilitiesData[index].ability || "";
        
        // Update description
        if (abilityDescs[index]) {
          abilityDescs[index].value = abilitiesData[index].desc || "";
          // Trigger auto-resize for textarea
          abilityDescs[index].dispatchEvent(new Event('input'));
        }
      }
      
      // Reset info button state
      const infoBtn = sel.parentElement.querySelector(".info-btn");
      if (infoBtn) {
        infoBtn.classList.remove("bg-cyan-500", "text-white");
        infoBtn.classList.add("bg-gray-600", "text-gray-300");
      }
    });
    
    // Update delete button visibility and validate selections
    updateDeleteButtons(abilitiesWrap);
    validateMoteSelections();
    validateAbilitySelections();
  }

  /** Validate mote selections to prevent duplicates */
  function validateMoteSelections() {
    const moteSelects = document.querySelectorAll('#mote-1 select, #mote-2 select, #mote-3 select');
    const selectedMotes = new Set();
    
    moteSelects.forEach(select => {
      const currentValue = select.value;
      const options = select.querySelectorAll('option');
      
      options.forEach(option => {
        if (option.value === '') {
          option.disabled = false;
          return;
        }
        
        // Disable if already selected by another mote
        if (selectedMotes.has(option.value) && option.value !== currentValue) {
          option.disabled = true;
          option.style.color = '#6b7280'; // Gray out
        } else {
          option.disabled = false;
          option.style.color = '';
        }
      });
      
      if (currentValue) {
        selectedMotes.add(currentValue);
      }
    });
  }

  /** Validate ability selections to prevent duplicates (except second to last) */
  function validateAbilitySelections() {
    const moteContainers = document.querySelectorAll('#mote-1, #mote-2, #mote-3');
    
    moteContainers.forEach(moteContainer => {
      const abilitySelects = moteContainer.querySelectorAll('.mt-3 select');
      const selectedAbilities = new Set();
      
      // First pass: collect all selected abilities
      abilitySelects.forEach(select => {
        if (select.value) {
          selectedAbilities.add(select.value);
        }
      });
      
      // Second pass: validate each select
      abilitySelects.forEach((select, index) => {
        const isSecondToLast = index === abilitySelects.length - 2;
        const options = select.querySelectorAll('option');
        
        options.forEach(option => {
          if (option.value === '') {
            option.disabled = false;
            return;
          }
          
          // Allow if it's the current selection or if it's second to last
          if (option.value === select.value || isSecondToLast) {
            option.disabled = false;
            option.style.color = '';
          } else if (selectedAbilities.has(option.value)) {
            // Check if this is a casting ability (contains 'casting' in the name)
            const isCastingAbility = option.value.toLowerCase().includes('casting');
            if (isCastingAbility) {
              // Allow casting abilities to be selected multiple times
              option.disabled = false;
              option.style.color = '';
            } else {
              // Disable if already selected by another ability (non-casting)
              option.disabled = true;
              option.style.color = '#6b7280'; // Gray out
            }
          } else {
            option.disabled = false;
            option.style.color = '';
          }
        });
      });
    });
  }


  // =============================
  // Dynamic UI Functions
  // =============================
  
  /** Add a new mind break card when user clicks the button. */
    function addMindBreak() {
        const mindBreaks = document.getElementById("mindBreaks");
        const newCard = document.createElement("div");
    newCard.className = "p-3 rounded-xl border border-white/10 bg-white/5 relative";
    
    // Create delete button (only if there's more than one mind break)
    const deleteBtn = el("button", "absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-full bg-red-500/20 border border-red-300/30 hover:bg-red-500/30 text-red-300 hover:text-red-200 transition-colors");
    deleteBtn.innerHTML = "×";
    deleteBtn.title = "Delete mind break";
    deleteBtn.onclick = () => {
      // Only allow deletion if there's more than one mind break
      if (mindBreaks.children.length > 1) {
        newCard.remove();
        updateMindBreakDeleteButtons();
      }
    };
    
    // Create form fields
    const name = input({ placeholder: "Name", className: "w-full mb-2 pr-8" });
        const desc = textarea({ placeholder: "Description", rows: 3 });
    
    // Assemble the card
    newCard.appendChild(deleteBtn);
        newCard.appendChild(name);
        newCard.appendChild(desc);
        mindBreaks.appendChild(newCard);
    
    // Update delete button visibility
    updateMindBreakDeleteButtons();
  }

  /** Update mind break delete button visibility based on number of mind breaks. */
  function updateMindBreakDeleteButtons() {
    const mindBreaks = document.getElementById("mindBreaks");
    const mindBreakCards = mindBreaks.querySelectorAll("div");
    mindBreakCards.forEach((card) => {
      const deleteBtn = card.querySelector("button");
      if (deleteBtn) {
        // Hide delete button if this is the only mind break
        deleteBtn.style.display = mindBreakCards.length > 1 ? "flex" : "none";
      }
    });
  }

  /** Add a new inventory item when user clicks the button. */
  function addInventoryItem() {
    const inventory = document.getElementById("inventory");
    const newItem = document.createElement("div");
    newItem.className = "p-3 rounded-xl border border-white/10 bg-white/5 relative";
    
    // Create delete button
    const deleteBtn = el("button", "absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-full bg-red-500/20 border border-red-300/30 hover:bg-red-500/30 text-red-300 hover:text-red-200 transition-colors");
    deleteBtn.innerHTML = "×";
    deleteBtn.title = "Delete item";
    deleteBtn.onclick = () => newItem.remove();
    
    // Create form fields
    const name = input({ placeholder: "Item Name", className: "w-full mb-2 pr-8" });
    const desc = textarea({ placeholder: "Description", rows: 2 });
    
    // Assemble the item
    newItem.appendChild(deleteBtn);
    newItem.appendChild(name);
    newItem.appendChild(desc);
    inventory.appendChild(newItem);
  }

  /** Add a new mind alteration item when user clicks the button. */
  function addMindAlteration() {
    const mindAlterations = document.getElementById("mindAlterations");
    const newItem = document.createElement("div");
    newItem.className = "p-3 rounded-xl border border-white/10 bg-white/5 relative";
    
    // Create delete button
    const deleteBtn = el("button", "absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-full bg-red-500/20 border border-red-300/30 hover:bg-red-500/30 text-red-300 hover:text-red-200 transition-colors");
    deleteBtn.innerHTML = "×";
    deleteBtn.title = "Delete mind alteration";
    deleteBtn.onclick = () => newItem.remove();
    
    // Create form fields
    const name = input({ placeholder: "Name", className: "w-full mb-2 pr-8" });
    const desc = textarea({ placeholder: "Description", rows: 2 });
    
    // Assemble the item
    newItem.appendChild(deleteBtn);
    newItem.appendChild(name);
    newItem.appendChild(desc);
    mindAlterations.appendChild(newItem);
  }

  // Make functions available globally
  window.addMindBreak = addMindBreak;
  window.addInventoryItem = addInventoryItem;
  window.addEnhancement = addEnhancement;
  window.addMastery = addMastery;
  window.addMindAlteration = addMindAlteration;

  // =============================
  // Initialize the page
  // =============================
  
  // Wait for DOM to be ready
  document.addEventListener('DOMContentLoaded', function() {
    // Initialize abilities data first
    initializeAbilitiesData();
    
    // Build all the dynamic sections
    buildCoreAttributes(document.getElementById("coreAttributes"));
    buildCalculatedAttributes(document.getElementById("calcAttributes"));
    buildMote(document.getElementById("mote-1"));
    buildMote(document.getElementById("mote-2"));
    buildMote(document.getElementById("mote-3"));
    buildEnhancements(document.getElementById("enhancements"));
    buildMasteries(document.getElementById("masteries"));
    buildMindAlterations(document.getElementById("mindAlterations"));
    buildMindBreaks(document.getElementById("mindBreaks"));
    
    // Wire up export/import buttons
    document.getElementById('exportBtn').addEventListener('click', exportCharacter);
    document.getElementById('importBtn').addEventListener('click', showImportDialog);
    
    // Initialize validation
    validateMoteSelections();
    validateAbilitySelections();
  });
  
})();
