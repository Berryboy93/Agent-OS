main -> _ dag _ {% id %}

dag -> "dag" _ "{" _ nodes _ edges? _ "}" {% d => ({nodes: d[4], edges: d[6] || []}) %}

nodes -> "nodes" _ ":" _ "[" _ nodeList _ "]" {% ([,,,,,,list]) => list %}
edges -> "edges" _ ":" _ "[" _ edgeList _ "]" {% ([,,,,,,list]) => list %}

nodeList -> node | nodeList _ "," _ node {% ([a,,b]) => [a].concat(b || []) %}
edgeList -> edge | edgeList _ "," _ edge {% ([a,,b]) => [a].concat(b || []) %}

node -> "{" _ nodeProps _ "}" {% ([,,p]) => p %}
nodeProps -> nodeProp | nodeProps _ "," _ nodeProp {% ([a,,b]) => Object.assign({}, a, b) %}

nodeProp -> idProp | typeProp | executorProp | payloadProp
idProp -> "id" _ ":" _ string {% ([,,,,s]) => ({id: s}) %}
typeProp -> "type" _ ":" _ string {% ([,,,,s]) => ({type: s}) %}
executorProp -> "executor" _ ":" _ string {% ([,,,,s]) => ({executor: s}) %}
payloadProp -> "payload" _ ":" _ obj {% ([,,,,o]) => ({payload: o}) %}

edge -> "{" _ "from" _ ":" _ string _ "," _ "to" _ ":" _ string _ "}" {% d => ({from: d[6], to: d[12]}) %}

string -> singleQuoteString | doubleQuoteString
singleQuoteString -> "'" [^']* "'" {% ([,s]) => s.join("") %}
doubleQuoteString -> '"' [^"]* '"' {% ([,s]) => s.join("") %}

obj -> emptyObj | fullObj
emptyObj -> "{" _ "}" {% () => ({}) %}
fullObj -> "{" _ pairList _ "}" {% ([,,p]) => p %}

pairList -> pair | pairList _ "," _ pair {% ([a,,b]) => Object.assign({}, a, b) %}
pair -> string _ ":" _ value {% ([k,,,,v]) => ({[k]: v}) %}
value -> string | number
number -> \d+ {% d => Number(d[0].join("")) %}

_ -> [\s\n]:*
