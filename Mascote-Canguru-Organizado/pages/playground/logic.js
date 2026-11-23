
class Component extends DCLogic {
state = { s: 0 };
extra() {
const names = ["Força", "Correndo", "Confiante", "Halter", "Elástico", "Yoga", "Campeão · novo", "Natal · novo", "Modo foco · novo", "Relax · novo"];
const descs = ["Duplo bíceps: os antebraços sobem e contraem no ritmo", "Corrida de verdade: pernas e braços alternando na esteira", "Loop: respiração calma, piscada e balanço leve", "Loop: rosca bíceps com o halter de 15 kg", "Loop: saltos com o elástico e aterrissagem elástica", "Loop: respiração lenta na postura do guerreiro", "Novo visual: medalha de ouro, confete e duplo bíceps", "Novo visual: gorro de Papai Noel com neve caindo", "Novo visual: faixa de suor verde-limão no treino pesado", "Novo visual: óculos escuros com reflexo (descanso / fim de semana)"];
const s = this.state.s;
const out = { currentDesc: descs[s] };
names.forEach((n, i) => { out['is' + i] = s === i; });
out.states = names.map((n, i) => ({
label: n,
pick: () => this.setState({ s: i }),
style: 'min-height: 46px; border-radius: 14px; font-family: Nunito, sans-serif; font-size: 15px; font-weight: 800; cursor: pointer; ' + (s === i ? 'background: #2B2F33; color: #C8F031; border: 2px solid #2B2F33' : 'background: #FFFFFF; color: #2B2F33; border: 2px solid #C9D0D6')
}));
return out;
}
renderVals() {
return this.extra();
}
}
