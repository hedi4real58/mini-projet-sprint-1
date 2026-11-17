import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Genre } from '../model/genre.model';
import { JeuService } from '../services/jeu.service';
import { UpdateGenreComponent } from '../update-genre/update-genre.component';

@Component({
  selector: 'app-liste-genres',
  templateUrl: './liste-genres.component.html',
  standalone: true,
  imports: [CommonModule, UpdateGenreComponent],
})
export class ListeGenresComponent implements OnInit {
  ajout: boolean = true;
  genres!: Genre[];
  updatedGen: Genre = { "idGen": 0, "nomGen": "" };
  ancienId: number = 0;   // ID of the genre before editing

  constructor(private jeuService: JeuService) { }

  ngOnInit(): void {
    this.chargerCategories();
  }

  genreUpdated(gen: Genre) {
    console.log("Gen updated event", gen);
    const ancien = this.ajout ? undefined : this.ancienId;

    this.jeuService.ajouterGenre(gen, ancien).subscribe({
      next: () => {
        this.chargerCategories();
        this.updatedGen = { "idGen": 0, "nomGen": "" };
        this.ajout = true;
      },
      error: (err) => {
        console.error("ERREUR", err);
        alert(err.message);
      }
    });
  }

  chargerCategories() {
    this.jeuService.listeGenre().
    subscribe(gens => {
      this.genres = gens._embedded.genres;
      console.log(gens);
    });
  }

  updategen(gen: Genre) {
    this.updatedGen = { ...gen };
    this.ancienId = gen.idGen;
    this.ajout = false;
  }
}