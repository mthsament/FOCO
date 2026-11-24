// Catálogo de exercícios para montar o treino: primeiro a categoria, depois o exercício.
// Linhas começadas por "# " são categorias; as seguintes são exercícios. Repetidos na mesma categoria são ignorados.
const TEXTO = `
# Peito
Supino reto com barra
Supino reto com halteres
Supino inclinado com barra
Supino inclinado com halteres
Supino declinado com barra
Supino declinado com halteres
Supino na máquina (chest press)
Supino inclinado na máquina
Supino no Smith
Supino inclinado no Smith
Supino pegada fechada
Supino com pegada neutra
Crucifixo reto com halteres
Crucifixo inclinado com halteres
Crucifixo declinado
Crucifixo máquina (peck deck)
Crossover polia alta
Crossover polia média
Crossover polia baixa
Crucifixo unilateral na polia
Flexão de braço
Flexão com pés elevados
Flexão com joelhos no chão
Flexão diamante
Flexão com palmas
Flexão com TRX
Mergulho nas paralelas (foco peito)
Pullover com halter
Pullover na polia
Svend press
Landmine press

# Costas
Barra fixa pronada
Barra fixa supinada
Barra fixa pegada neutra
Barra fixa assistida
Puxada frontal pegada aberta
Puxada frontal pegada fechada
Puxada frontal supinada
Puxada neutra (triângulo)
Puxada atrás da nuca
Puxada com braço reto (pulldown)
Remada curvada com barra
Remada curvada supinada
Remada Pendlay
Remada unilateral com halter (serrote)
Remada cavalinho (T-bar)
Remada baixa no triângulo
Remada baixa pegada aberta
Remada na máquina
Remada máquina peito apoiado
Remada no Smith
Remada invertida
Remada unilateral na polia
Remada com apoio no banco inclinado
Remada alta
Levantamento terra
Levantamento terra romeno
Levantamento terra sumô
Barra hex (trap bar) deadlift
Rack pull
Pullover com halter
Extensão lombar (banco 45°)
Good morning
Superman
Encolhimento com barra (trapézio)
Encolhimento com halteres
Encolhimento no Smith

# Ombros
Desenvolvimento com barra
Desenvolvimento com halteres
Desenvolvimento Arnold
Desenvolvimento na máquina
Desenvolvimento no Smith
Desenvolvimento militar em pé
Push press
Landmine press unilateral
Elevação lateral com halteres
Elevação lateral na polia
Elevação lateral na máquina
Elevação lateral inclinada (deitado de lado)
Elevação frontal com halteres
Elevação frontal com barra
Elevação frontal na polia
Elevação frontal com anilha
Crucifixo inverso com halteres
Crucifixo inverso na máquina
Crucifixo inverso na polia
Face pull
Remada alta com barra W
Elevação em Y
Rotação externa com halter
Rotação externa na polia
Rotação interna na polia
Pike push-up
Handstand push-up (parada de mão)

# Bíceps
Rosca direta com barra reta
Rosca direta com barra W
Rosca alternada com halteres
Rosca simultânea com halteres
Rosca martelo
Rosca martelo cruzada
Rosca martelo na corda
Rosca concentrada
Rosca Scott com barra
Rosca Scott com halter
Rosca Scott na máquina
Rosca inclinada com halteres
Rosca no cabo (polia baixa)
Rosca 21
Rosca Spider
Rosca inversa (antebraço/braquial)
Rosca Zottman
Rosca bayesian (polia atrás)
Rosca na polia alta (duplo bíceps)
Rosca com elástico

# Tríceps
Tríceps pulley com barra reta
Tríceps pulley com corda
Tríceps pulley com barra V
Tríceps pulley unilateral
Tríceps pulley invertido
Tríceps testa com barra W
Tríceps testa com halteres
Tríceps testa na polia
Tríceps francês com halter
Tríceps francês na polia (corda)
Tríceps coice
Tríceps coice na polia
Tríceps na máquina
Mergulho no banco
Mergulho nas paralelas (foco tríceps)
Mergulho na máquina
Supino fechado
Flexão fechada
Extensão overhead com barra
JM press

# Antebraço
Rosca de punho (flexão)
Rosca de punho inversa (extensão)
Rosca inversa
Rosca martelo
Farmer walk (caminhada do fazendeiro)
Dead hang (pendurar na barra)
Pinça com anilha
Rolo de punho (wrist roller)
Hand grip

# Quadríceps
Agachamento livre com barra
Agachamento frontal
Agachamento no Smith
Agachamento hack
Agachamento hack invertido
Agachamento goblet
Agachamento sumô
Agachamento búlgaro
Agachamento pistol
Agachamento com salto
Agachamento isométrico na parede
Agachamento Zercher
Agachamento overhead
Agachamento no banco (box squat)
Agachamento com pausa
Agachamento na máquina (pendulum)
Belt squat
Sissy squat
Thruster
Leg press 45°
Leg press horizontal
Leg press unilateral
Cadeira extensora
Cadeira extensora unilateral
Afundo com halteres
Afundo com barra
Afundo no Smith
Afundo caminhando
Afundo reverso
Afundo lateral
Passada
Step-up no banco

# Posterior de coxa
Stiff com barra
Stiff com halteres
Stiff unilateral
Levantamento terra romeno
Levantamento terra com pernas retas
Terra unilateral (single leg RDL)
Mesa flexora
Cadeira flexora
Flexora em pé unilateral
Flexora na polia
Flexora com bola suíça
Flexora com deslizante (slider)
Nordic curl
Glute-ham raise
Good morning
Hiperextensão (banco romano)
Kettlebell swing

# Glúteos
Elevação pélvica (hip thrust) com barra
Hip thrust no Smith
Hip thrust na máquina
Hip thrust unilateral
Ponte de glúteo
Ponte unilateral
Frog pump
Glute kickback na polia
Glute kickback na máquina
Coice em quatro apoios
Abdução de quadril na máquina (cadeira abdutora)
Cadeira abdutora inclinada para frente
Abdução na polia
Abdução com elástico (mini band)
Abdução deitado de lado
Clamshell
Fire hydrant
Agachamento sumô
Agachamento búlgaro
Afundo / passada
Step-up alto
Pull-through na polia
Back extension 45° foco glúteo
Good morning

# Adutores
Cadeira adutora
Adução na polia
Adução com bola entre as pernas
Adução deitado de lado
Agachamento sumô
Afundo lateral
Copenhagen plank
Slide lateral (deslizante)

# Panturrilha
Panturrilha em pé na máquina
Panturrilha em pé no Smith
Panturrilha sentado (sóleo)
Panturrilha no leg press
Panturrilha no hack
Panturrilha unilateral com halter
Panturrilha no degrau (peso corporal)
Panturrilha burro (donkey calf raise)
Salto na ponta dos pés
Elevação tibial (canela)
Pular corda

# Abdômen e Core
Abdominal reto (crunch)
Abdominal na máquina
Abdominal na polia (crunch ajoelhado)
Abdominal infra (elevação de pernas deitado)
Abdominal canivete (V-up)
Abdominal bicicleta
Abdominal remador
Abdominal oblíquo (crunch cruzado)
Abdominal declinado
Abdominal com peso
Abdominal com bola suíça
Elevação de pernas na barra fixa
Elevação de joelhos na barra fixa
Elevação de pernas na paralela (cadeira romana)
Toes to bar
Roda abdominal (ab wheel)
Prancha frontal
Prancha lateral
Prancha com toque no ombro
Prancha com elevação de perna
Prancha dinâmica (RKC / body saw)
Mountain climber
Dead bug
Bird dog
Hollow body hold
Pallof press
Lenhador (wood chop)
Rotação russa (Russian twist)
Elevação lateral de tronco (side bend)
Vacuum abdominal
Tesoura (flutter kick)
Windshield wipers
Dragon flag
L-sit
Caminhada com peso (suitcase carry)
Slam ball

# Corpo inteiro / Funcional
Burpee
Clean (arremesso)
Power clean
Hang clean
Snatch (arranco)
Clean and jerk
Thruster
Kettlebell swing
Kettlebell snatch
Kettlebell clean and press
Turkish get-up
Farmer walk
Sled push (empurrar trenó)
Sled pull (puxar trenó)
Prowler
Battle rope (corda naval)
Wall ball
Slam ball
Medicine ball throw
Box jump
Salto em profundidade
Pular corda
Man maker
Devil press
Bear crawl
Subida na corda
Muscle-up
Ring row / ring dips
Pneu (virar pneu)

# Cardio
Esteira – caminhada
Esteira – caminhada inclinada
Esteira – corrida contínua
Esteira – tiros (HIIT)
Bicicleta ergométrica (vertical)
Bicicleta horizontal (reclinada)
Spinning
Air bike (assault bike)
Elíptico (transport)
Simulador de escada (stairmaster)
Remo ergométrico
Ski erg
Escalador (versaclimber)
Pular corda
Natação
Corrida ao ar livre
Caminhada ao ar livre
Battle rope (HIIT)
Jumping jack
Polichinelo
Corrida estacionária (high knees)
Circuito funcional

# Mobilidade e aquecimento
Rotação de ombros com bastão/elástico
Dislocates
Gato-vaca
Cat-camel
Mobilidade de quadril (90/90)
Mobilidade de tornozelo na parede
Agachamento profundo (mobilidade)
Rotação torácica
Passada com rotação (world's greatest stretch)
Alongamento do peitoral na porta
Alongamento de quadríceps
Alongamento de posterior
Alongamento de flexor de quadril
Liberação miofascial com rolo (foam roller)
Liberação com bola de lacrosse
Face pull leve (ativação)
Ativação de glúteo com mini band
Aquecimento no elíptico/esteira
`

export const CATEGORIAS = (() => {
  const out = []
  for (const linha of TEXTO.split('\n').map((l) => l.trim()).filter(Boolean)) {
    if (linha.startsWith('# ')) out.push({ nome: linha.slice(2), exercicios: [] })
    else if (!out[out.length - 1].exercicios.includes(linha)) out[out.length - 1].exercicios.push(linha)
  }
  return out
})()

export const exerciciosDe = (categoria) => CATEGORIAS.find((c) => c.nome === categoria)?.exercicios || []
// categoria de um exercício já salvo (para treinos antigos ou importados que só têm o nome)
export const categoriaDe = (nome) => (nome ? CATEGORIAS.find((c) => c.exercicios.includes(nome))?.nome || '' : '')
