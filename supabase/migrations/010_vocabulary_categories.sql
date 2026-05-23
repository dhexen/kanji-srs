-- Add semantic category and grammatical word_type to shared vocabulary table.
-- NULL = not yet classified.
-- category: e.g. 'animals', 'nature', 'colors', 'weather', 'time', 'food',
--           'transport', 'family', 'body', 'school', 'home', 'work',
--           'places', 'numbers', 'emotions', 'actions', 'sports', 'culture', 'other'
-- word_type: e.g. 'noun', 'verb_transitive', 'verb_intransitive', 'verb',
--            'adj_i', 'adj_na', 'adverb', 'particle', 'expression'
ALTER TABLE vocabulary ADD COLUMN IF NOT EXISTS category text;
ALTER TABLE vocabulary ADD COLUMN IF NOT EXISTS word_type text;
