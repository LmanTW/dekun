import State from '../scripts/state'

// The tasks component.
export default () => {
  return (
    <div class='shadow' style={{ display: (State.layout.tasks) ? 'block' : 'none', border: '0.05rem solid ', borderRadius: '0.5rem', marginBottom: 'var(--spacing-medium)', overflow: 'hidden' }}>
      <h3 class={(State.settings.reduceTransparency) ? 'container-solid-light' : 'container-glassy-light'} style={{ padding: 'var(--spacing-medium)' }}>Tasks</h3>
      <div class={(State.settings.reduceTransparency) ? 'container-solid-dark' : 'container-glassy-dark'}>
        <div style={{ width: '100%', height: '0.05rem', backgroundColor: 'var(--color-foreground)', opacity: 0.1 }}></div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-small)', padding: 'var(--spacing-medium)', overflowX: 'auto' }}>
          {
            (State.taskList.length > 0) ? State.taskList.map((id) => {
              const task = State.taskMap[id]

              return (
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <h5 style={{ color: `var(--color-${task.type})`, textWrap: 'nowrap', marginRight: 'var(--spacing-small)' }}>{task.title}</h5>
                  <p style={{ textWrap: 'nowrap' }}>{task.message}</p>
                </div>
              )
            }) : (
              <p style={{ opacity: 0.25 }}>No Active Task</p>
            )
          }
        </div>
      </div>
    </div>
  )
}
