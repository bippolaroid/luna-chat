import { Show, For, createResource } from "solid-js";

const fetchCatalogData = async () => {
  const response = await fetch("http://localhost:1337/api/load-files");
  if (response.ok) {
    return response.json();
  }
  throw new Error("Failed to fetch catalog data");
};

export default function Catalog() {
  const [data, { refetch }] = createResource(fetchCatalogData);

  return (
    <div class="dark:invert bg-neutral-50 py-6 px-12 h-fit">
      <h1 class="text-6xl text-yellow-300 font-bold mb-3">Catalog</h1>
      <div class="border px-3 py-3">
        <Show when={data.loading}>
          <span class="text-neutral-200 animate-pulse">Loading...</span>
        </Show>
        <Show when={data()} fallback="No data available.">
          <For each={data()}>
            {(convo) => {
              return (
                <>
                  <div class="mb-3">
                    <For each={convo}>
                      {(item) => {
                        if (item.status === "begin") {
                          return (
                            <>
                              <h2 class="text-3xl py-6 px-3 bg-yellow-300 border border-yellow-300 mb-3">
                                {`${item.dateCreated}: ${item.title}`}
                              </h2>
                            </>
                          );
                        }

                        if (item.content) {
                          return (
                            <>
                              <div
                                class={`border-[0.5px] p-3 mb-3 ${
                                  item.role === "assistant"
                                    ? "border-violet-900"
                                    : "border-neutral-900"
                                }`}
                              >
                                <h3
                                  class={`text-xl font-bold w-fit px-3 mb-3 ${
                                    item.role === "assistant"
                                      ? "bg-violet-300 text-violet-900"
                                      : "bg-neutral-300 text-neutral-900"
                                  }`}
                                >
                                  {item.role}
                                </h3>
                                <p>{item.content}</p>
                              </div>
                            </>
                          );
                        }

                        if (item.status === "end") {
                          return (
                            <>
                            <h2 class="text-3xl py-6 px-3 bg-yellow-300 border border-yellow-300 mb-12">
                                // end
                              </h2>
                            </>
                          )
                        }
                      }}
                    </For>
                  </div>
                </>
              );
            }}
          </For>
          <button
            class="bg-violet-600 px-6 py-3 hover:opacity-50 transition-opacity duration-500"
            onClick={refetch}
          >
            Refresh
          </button>
        </Show>
      </div>
    </div>
  );
}
