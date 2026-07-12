import { Component, type ErrorInfo, type ReactNode } from 'react'

type Props = { children: ReactNode }
type State = { error: Error | null }

/**
 * Sans ça, une exception non rattrapée dans un module (ex: une date mal formée) démonte tout
 * l'arbre React et laisse un écran vide sur le fond quasi-noir du thème — sans aucun message.
 * On isole l'erreur ici pour proposer un rechargement plutôt qu'un plantage silencieux.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('MonHub a rencontré une erreur non gérée :', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="rounded-[20px] border border-[var(--red)]/40 bg-[var(--surface)] p-8 text-center">
          <h2 className="font-display mb-2 text-lg font-bold text-[var(--text)]">Une erreur est survenue</h2>
          <p className="mx-auto mb-4 max-w-sm text-sm text-[var(--text-muted)]">
            Quelque chose a fait planter l'affichage de ce module. Tes données ne sont pas
            perdues — elles restent dans la mémoire de l'appareil et sur GitHub. Essaie un autre
            onglet, ou recharge l'app.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="font-display rounded-full bg-[var(--gold)] px-4 py-2 text-sm font-semibold text-[#1a1408]"
          >
            Recharger l'app
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
