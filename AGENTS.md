# Instrucciones del repositorio API

- Lee [README.md](README.md), [Branch_changes.md](Branch_changes.md) y
  [docs/next-job](docs/next-job) antes de seleccionar un punto.
- Sigue el alcance y las pruebas del siguiente punto autorizado en `docs/next-job`.
  El plan fuente está en `Zephyriov/docs/blueprint/plan-trabajo-agentico.md`;
  la ubicación local de referencia se documenta en `docs/next-job`.
- Esta raíz contiene API e infraestructura. Android y web tienen repositorios
  separados. No copies módulos del Next/Supabase de referencia.
- La especificación SRS activa está en [docs/reglas-srs.md](docs/reglas-srs.md)
  y sus fixtures en `src/domain/fixtures/`. Las copias B01 del repositorio de
  referencia son evidencia histórica. No edites ambas fuentes en paralelo.
- Documenta cada cambio en `docs/`, actualiza README para decisiones de
  arquitectura y Branch_changes al cerrar la sesión con `[Listo :v]`.
- Conserva los cambios ajenos y ejecuta tests, lint, typecheck y build que
  correspondan al punto. Detente ante contradicción o intervención manual.
