import { Injectable } from '@angular/core';
import { Observable, map, catchError, of, switchMap, throwError } from 'rxjs';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Jeu } from '../jeux.model';
import { Genre } from '../model/genre.model';
import { GenreWrapper } from '../model/Genrewrapped';

const httpOptions = {
  headers: new HttpHeaders({ 'Content-Type': 'application/json' })
};

const CLE_STOCKAGE = 'jeux-locaux';
const CLE_GENRES = 'genres-locaux';

@Injectable({
  providedIn: 'root'
})
export class JeuService {
  jeux!: Jeu[];
  jeu!: Jeu;
  genres!: Genre[];

  genresParDefaut: Genre[] = [
    { idGen: 1, nomGen: 'Action' },
    { idGen: 2, nomGen: 'Party games' },
    { idGen: 3, nomGen: 'Sport' },
    { idGen: 4, nomGen: 'Stratégie' },
  ];

  private jeuxParDefaut(): Jeu[] {
    return [
      { idjeu: 1, nomjeu: 'Battlefield 5', prixjeu: 59.99, dateCreation: new Date('2018-11-20'), genre: this.genresParDefaut[0] },
      { idjeu: 2, nomjeu: 'Fall Guys', prixjeu: 19.99, dateCreation: new Date('2020-08-04'), genre: this.genresParDefaut[1] },
      { idjeu: 3, nomjeu: 'Forza Horizon 5', prixjeu: 49.99, dateCreation: new Date('2021-11-09'), genre: this.genresParDefaut[2] },
    ];
  }

  apiURL: string = 'http://localhost:8080/jeux/api';
  apiURLGen: string = 'http://localhost:8080/jeux/gen';

  private modeLocal: boolean | null = null;
  private jeuxLocaux: Jeu[] = this.chargerLocal();
  private genresLocaux: Genre[] = this.chargerGenresLocal();

  constructor(private http: HttpClient) { }

  // ---------- Jeux : stockage local ----------
  private chargerLocal(): Jeu[] {
    try {
      const brut = localStorage.getItem(CLE_STOCKAGE);
      if (brut) {
        const liste = JSON.parse(brut);
        if (Array.isArray(liste)) return liste;
      }
    } catch { /* ignore */ }
    return this.jeuxParDefaut();
  }

  private sauverLocal(): void {
    try {
      localStorage.setItem(CLE_STOCKAGE, JSON.stringify(this.jeuxLocaux));
    } catch { /* ignore */ }
  }

  // ---------- Genres : stockage local ----------
  private chargerGenresLocal(): Genre[] {
    try {
      const brut = localStorage.getItem(CLE_GENRES);
      if (brut) {
        const liste = JSON.parse(brut);
        if (Array.isArray(liste) && liste.length > 0) return liste;
      }
    } catch { /* ignore */ }
    return this.genresParDefaut.map(g => ({ ...g }));
  }

  private sauverGenresLocal(): void {
    try {
      localStorage.setItem(CLE_GENRES, JSON.stringify(this.genresLocaux));
    } catch { /* ignore */ }
  }

  // ---------- Détection du mode local ----------
  private estLocal(): Observable<boolean> {
    if (this.modeLocal !== null) return of(this.modeLocal);
    return this.http.get<Jeu[]>(this.apiURL).pipe(
      map(liste => {
        this.modeLocal = !(Array.isArray(liste) && liste.length > 0);
        return this.modeLocal;
      }),
      catchError(() => {
        this.modeLocal = true;
        return of(true);
      })
    );
  }

  // ---------- Jeux ----------
  listeJeu(): Observable<Jeu[]> {
    return this.estLocal().pipe(
      switchMap(local => local
        ? of([...this.jeuxLocaux])
        : this.http.get<Jeu[]>(this.apiURL))
    );
  }

  addJeu(jeu: Jeu): Observable<Jeu> {
    return this.estLocal().pipe(
      switchMap(local => {
        if (!local) return this.http.post<Jeu>(this.apiURL, jeu, httpOptions);
        const nouveau: Jeu = { ...jeu };
        nouveau.idjeu = Number(nouveau.idjeu);
        if (!nouveau.idjeu || this.jeuxLocaux.some(j => j.idjeu == nouveau.idjeu)) {
          nouveau.idjeu = Math.max(0, ...this.jeuxLocaux.map(j => Number(j.idjeu))) + 1;
        }
        this.jeuxLocaux.push(nouveau);
        this.sauverLocal();
        return of(nouveau);
      })
    );
  }

  supprimerJeu(id: number): Observable<any> {
    return this.estLocal().pipe(
      switchMap(local => {
        if (!local) return this.http.delete(`${this.apiURL}/${id}`, httpOptions);
        this.jeuxLocaux = this.jeuxLocaux.filter(j => j.idjeu != id);
        this.sauverLocal();
        return of(null);
      })
    );
  }

  consulterJeu(id: number): Observable<Jeu> {
    return this.estLocal().pipe(
      switchMap(local => local
        ? of({ ...this.jeuxLocaux.find(j => j.idjeu == id)! })
        : this.http.get<Jeu>(`${this.apiURL}/${id}`))
    );
  }

  updateJeu(jeu: Jeu): Observable<Jeu> {
    return this.estLocal().pipe(
      switchMap(local => {
        if (!local) return this.http.put<Jeu>(this.apiURL, jeu, httpOptions);
        this.jeuxLocaux = this.jeuxLocaux.map(j => j.idjeu == jeu.idjeu ? { ...jeu } : j);
        this.sauverLocal();
        return of(jeu);
      })
    );
  }

  // ---------- Genres ----------
  listeGenre(): Observable<GenreWrapper> {
    return this.estLocal().pipe(
      switchMap(local => {
        if (local) {
          const locale: GenreWrapper = { _embedded: { genres: [...this.genresLocaux] } };
          return of(locale);
        }
        const defaut: GenreWrapper = { _embedded: { genres: this.genresParDefaut } };
        return this.http.get<any>(this.apiURLGen).pipe(
          map(res => {
            const wrapped: GenreWrapper = Array.isArray(res) ? { _embedded: { genres: res } } : res;
            const genres = wrapped?._embedded?.genres;
            return genres && genres.length > 0 ? wrapped : defaut;
          }),
          catchError(() => of(defaut))
        );
      })
    );
  }

  consulterGenre(id: number): Genre {
    return this.genresLocaux.find((gen) => gen.idGen == id)!;
  }

  rechercheParGenre(idGen: number): Observable<Jeu[]> {
    return this.estLocal().pipe(
      switchMap(local => local
        ? of(this.jeuxLocaux.filter(j => j.genre?.idGen == idGen))
        : this.http.get<Jeu[]>(`${this.apiURL}/jeuxgenre/${idGen}`))
    );
  }

  rechercherParNom(nom: string): Observable<Jeu[]> {
    return this.estLocal().pipe(
      switchMap(local => local
        ? of(this.jeuxLocaux.filter(j => j.nomjeu.toLowerCase().includes(nom.toLowerCase())))
        : this.http.get<Jeu[]>(`${this.apiURL}/jeuxByName/${nom}`))
    );
  }

  // Ajoute (idGen = 0) ou modifie (idGen existant) un genre
    // Ajoute un genre, ou modifie (y compris son ID) si ancienId est fourni
  ajouterGenre(gen: Genre, ancienId?: number): Observable<Genre> {
    return this.estLocal().pipe(
      switchMap(local => {
        if (!local) return this.http.post<Genre>(this.apiURLGen, gen, httpOptions);

        // ----- MODIFICATION -----
        if (ancienId !== undefined) {
          const nouvelId = Number(gen.idGen);

          if (nouvelId !== ancienId && this.genresLocaux.some(g => g.idGen == nouvelId)) {
            return throwError(() => new Error('Cet ID existe déjà pour un autre genre'));
          }

          const resultat: Genre = { ...gen, idGen: nouvelId };

          // replace the old genre (found by its OLD id)
          this.genresLocaux = this.genresLocaux.map(g => g.idGen == ancienId ? resultat : g);

          // keep the games linked to this genre in sync
          this.jeuxLocaux = this.jeuxLocaux.map(j =>
            j.genre?.idGen == ancienId ? { ...j, genre: resultat } : j);

          this.sauverGenresLocal();
          this.sauverLocal();
          return of(resultat);
        }

        // ----- AJOUT -----
        const resultat: Genre = {
          ...gen,
          idGen: Math.max(0, ...this.genresLocaux.map(g => Number(g.idGen))) + 1
        };
        this.genresLocaux.push(resultat);
        this.sauverGenresLocal();
        return of(resultat);
      })
    );
  }
}