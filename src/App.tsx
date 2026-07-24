import { createResource, For } from "solid-js";
import { supabase } from "./utils/supabase";

async function getTodos() {
  const { data: todos } = await supabase.from("todos").select();
  return todos;
}

function App() {
  const [todos] = createResource(getTodos);

  return (
    <main>
      <h1>Hello world!!!!</h1>
      <ul>
        <For each={todos()}>
          {(todo) => (
            <li>
              {`${todo.content} - ${new Date(todo.created_at).toLocaleString("fr-FR")}`}
            </li>
          )}
        </For>
      </ul>
    </main>
  );
}

export default App;
