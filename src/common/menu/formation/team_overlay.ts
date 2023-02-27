import { AssetsLoader } from "../../../utils/assets_loader";
import { Pokemon } from "./pokemon";
import { FormationTeam } from "./team";

interface PokemonCard {
    /** You can change the source to modify the sprite */
    card: HTMLDivElement;
    icon: HTMLDivElement;
    level: HTMLDivElement;
    hp: HTMLDivElement;
    name: HTMLDivElement;
    isLeader: boolean;
    belly: HTMLDivElement;
};

export class DungeonTeamOverlay {
    public team: FormationTeam;
    private elements: Record<number, PokemonCard> = {};
    private container!: HTMLDivElement;

    constructor(team: FormationTeam) {
        this.team = team;
        this.createContainer();
        this.isVisible = false;
    }

    public createContainer() {
        this.container = document.createElement("div");
        this.container.classList.add("team-overlay");
        document.getElementById("overlays")!.appendChild(this.container);
    }

    public update(team?: FormationTeam) {
        if (team) {
            this.team = team
            this.container.innerHTML = "";
            this.elements = {};
            for (let i = 0; i < this.team.pokemon.length; i++) {
                this.createCard(i);
            }
        }
        for (let i = 0; i < this.team.pokemon.length; i++) {
            this.updateCard(i);
        }
    }


    private updateHp(index: number) {
        const pokemon = this.team.pokemon[index];
        const card = this.elements[index];

        const hpContainer = card.hp;
        hpContainer.classList.toggle("healthy", pokemon.hp > pokemon.maxHp / 2);
        hpContainer.classList.toggle("hurting", pokemon.hp <= pokemon.maxHp / 2 && pokemon.hp > pokemon.maxHp / 4);
        hpContainer.classList.toggle("critical", pokemon.hp <= pokemon.maxHp / 4);

        const hpBar = hpContainer.querySelector(".hp-bar") as HTMLDivElement;
        const hpText = hpContainer.querySelector(".hp-text") as HTMLDivElement;
        hpBar.style.width = `${(pokemon.hp / pokemon.maxHp) * 100}%`;
        if (hpText) {
            hpText.innerText = `${pokemon.hp}/${pokemon.maxHp}`;
        }
    }
    private updateBelly(index: number) {
        const pokemon = this.team.pokemon[index];
        const card = this.elements[index];

        const belly = card.belly;
        const span = belly.querySelector("span") as HTMLSpanElement;
        if (span)
            span.innerText = `${pokemon.belly}`;
        const b = 100 - pokemon.belly;
        const o = b > 1 ? 3 : 0;
        belly.style.background =
            `linear-gradient(to bottom, var(--belly-bg), var(--belly-bg) ${b}%, var(--belly-fill) ${b + o}%, var(--belly-fill) 100%)`;

    }
    private updateLevel(index: number) {
        const pokemon = this.team.pokemon[index];
        const card = this.elements[index];

        const level = card.level;
        const span = level.querySelector("span") as HTMLSpanElement;
        if (span)
            span.innerText = `${pokemon.level}`;
    }
    private updateName(index: number) {
        const pokemon = this.team.pokemon[index];
        const card = this.elements[index];

        const name = card.name;
        name.innerText = pokemon.name;
    }
    private updateIcon(index: number) {
        const pokemon = this.team.pokemon[index];
        const card = this.elements[index];

        const icon = card.icon;
        const img = icon.querySelector("img") as HTMLImageElement;
        const path = AssetsLoader.getPokemonFormPath(pokemon.id, "portrait");
        img.src = path + "/Normal.png";
    }
    private updateCard(index: number) {
        this.updateHp(index);
        this.updateBelly(index);
        this.updateLevel(index);
        this.updateName(index);
        this.updateIcon(index);
    }

    private createIcon(): HTMLDivElement {
        const iconDiv = document.createElement("div");
        iconDiv.classList.add("team-overlay-icon");
        const icon = document.createElement("img");
        iconDiv.appendChild(icon);
        return iconDiv;
    }
    private createName(): HTMLDivElement {
        const name = document.createElement("div");
        name.classList.add("team-overlay-name");
        return name;
    }
    private createLevel(): HTMLDivElement {
        const level = document.createElement("div");
        level.classList.add("team-overlay-level");
        level.innerHTML = `L. <span class="lvl"></span>`;
        return level;
    }
    private createHp(isLeader = false): HTMLDivElement {
        const hp = document.createElement("div");
        hp.classList.add("team-overlay-hp", "healthy");
        const barContainer = document.createElement("div");
        barContainer.classList.add("hp-bar-container");
        const bar = document.createElement("div");
        bar.style.width = "100%";

        bar.classList.add("hp-bar");
        hp.innerHTML = "HP:";
        barContainer.appendChild(bar);
        hp.appendChild(barContainer);
        if (isLeader) {
            const text = document.createElement("div");
            text.classList.add("hp-text");
            hp.appendChild(text);
        }
        return hp;
    }
    private createBelly(isLeader = false): HTMLDivElement {
        const belly = document.createElement("div");
        belly.classList.add("team-overlay-belly");
        if (isLeader) {
            const span = document.createElement("span");
            belly.appendChild(span);
        }
        return belly;
    }
    private createCard(index: number): HTMLDivElement {
        const isLeader = index === 0;
        const card = document.createElement("div");
        card.classList.add("team-overlay-card", "menu-text");
        card.classList.toggle("card-leader", isLeader);
        card.classList.toggle("card-partner", !isLeader);
        // Card elements
        const icon = this.createIcon();
        const level = this.createLevel();
        const name = this.createName();
        const hp = this.createHp(isLeader);
        const belly = this.createBelly(isLeader);

        card.appendChild(icon);
        card.appendChild(level);
        card.appendChild(name);
        card.appendChild(hp);
        card.appendChild(belly);
        this.container.appendChild(card);

        // Update the elements
        this.elements[index] = {
            card,
            icon,
            level,
            hp,
            name,
            isLeader,
            belly
        };

        return card;
    }

    public set isVisible(visible: boolean) {
        this.container.classList.toggle("hidden", !visible);
    }
}