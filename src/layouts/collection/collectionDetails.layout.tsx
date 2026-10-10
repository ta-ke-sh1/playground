// import { useEffect, useMemo, useState } from "react";
// import {
//   Box,
//   Button,
//   Grid,
//   Group,
//   Select,
//   Stack,
//   Text,
//   TextInput,
//   Title,
//   UnstyledButton,
// } from "@mantine/core";
// import { useDisclosure, useMediaQuery } from "@mantine/hooks";
// import CollectionService from "../../services/collection.service.ts";
// import { useNavigate, useParams } from "react-router";
// import LayoutWrapper from "../../components/wrappers/layout/layout.wrapper.tsx";
// import { CollectionItemCard } from "../../components/card/collectionItem.card.tsx";
// import BilingualShuffle from "../../components/animations/bilingual.shuffle";
// import Footer from "../../components/footer/footer.tsx";
// import type { CollectionItemEntity } from "../../models/entity/collection.model";
// import {
//   IconChevronDown,
//   IconChevronLeft,
//   IconFile,
//   IconSearch,
//   IconTag,
//   IconX,
// } from "@tabler/icons-react";
// import { ShuffleText } from "../../components/animations/shuffle.text.tsx";
// import CyberpunkBackdrop from "../../components/background/cyberpunk.backdrop";
// import CatchphraseCard from "../../components/card/catchphrase.card.tsx";

// const SORT_OPTIONS = [
//   { value: "name-asc", label: "Name (A–Z)" },
//   { value: "name-desc", label: "Name (Z–A)" },
//   { value: "author-asc", label: "Author (A–Z)" },
//   { value: "newest", label: "Newest first" },
//   { value: "oldest", label: "Oldest first" },
// ];

// /**
//  * Themed styles for the filter controls (inputs, select dropdown, tag chips).
//  * Pseudo-states (hover / focus / active) can't be expressed with inline styles,
//  * so they live in a small scoped stylesheet that mirrors the "Return" button:
//  * orange border, card background, glow + lift on hover.
//  */
// const FILTER_CSS = `
//   .folio-field-label {
//     font-family: DotGothic16, monospace;
//     font-size: 12px;
//     font-weight: 700;
//     color: #FF7700;
//     letter-spacing: 1px;
//     text-transform: uppercase;
//     margin-bottom: 6px;
//   }

//   .folio-input {
//     background-color: var(--folio-card);
//     border: 1px solid #FF7700;
//     border-radius: 6px;
//     color: #fff;
//     font-family: "DM Mono", monospace;
//     font-size: 14px;
//     min-height: 42px;
//     padding-inline: 14px;
//     transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
//   }
//   .folio-input::placeholder {
//     color: rgba(255, 119, 0, 0.5);
//   }
//   .folio-input:hover {
//     border-color: #FF9933;
//     background-color: rgba(255, 119, 0, 0.08);
//   }
//   .folio-input:focus,
//   .folio-input:focus-within {
//     border-color: #FF9933;
//     background-color: rgba(255, 119, 0, 0.15);
//     box-shadow: 0 0 18px rgba(255, 119, 0, 0.5);
//     outline: none;
//   }

//   .folio-section {
//     color: #FF7700;
//   }

//   .folio-dropdown {
//     background-color: var(--folio-card);
//     border: 1px solid #FF7700;
//     border-radius: 6px;
//     box-shadow: 0 0 18px rgba(255, 119, 0, 0.35);
//   }
//   .folio-option {
//     font-family: "DM Mono", monospace;
//     font-size: 13px;
//     color: #fff;
//     border-radius: 4px;
//   }
//   .folio-option:hover,
//   .folio-option[data-combobox-selected],
//   .folio-option[data-combobox-active] {
//     background-color: rgba(255, 119, 0, 0.15);
//     color: #FF9933;
//   }

//   .folio-chip {
//     display: inline-flex;
//     align-items: center;
//     gap: 6px;
//     padding: 6px 12px;
//     background-color: var(--folio-card);
//     border: 1px solid rgba(255, 119, 0, 0.55);
//     border-radius: 6px;
//     color: #FF7700;
//     font-family: DotGothic16, monospace;
//     font-size: 13px;
//     font-weight: 700;
//     letter-spacing: 1px;
//     cursor: pointer;
//     transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
//   }
//   .folio-chip:hover {
//     background-color: rgba(255, 119, 0, 0.15);
//     border-color: #FF9933;
//     box-shadow: 0 0 14px rgba(255, 119, 0, 0.45);
//     transform: translateY(-2px);
//   }
//   .folio-chip:focus-visible {
//     outline: 2px solid #FF9933;
//     outline-offset: 2px;
//   }
//   .folio-chip[data-active="true"] {
//     background-color: #FF7700;
//     border-color: #FF7700;
//     color: #0a0a0a;
//     box-shadow: 0 0 14px rgba(255, 119, 0, 0.6);
//   }
//   .folio-chip__count {
//     font-family: "DM Mono", monospace;
//     font-size: 11px;
//     font-weight: 400;
//     opacity: 0.7;
//   }
//   .folio-chip--clear {
//     border-style: dashed;
//   }

//   .folio-toggle {
//     width: 100%;
//     justify-content: space-between;
//     padding: 10px 14px;
//     font-size: 14px;
//     text-transform: uppercase;
//   }
//   .folio-toggle[data-opened="true"] {
//     border-color: #FF9933;
//     box-shadow: 0 0 14px rgba(255, 119, 0, 0.45);
//   }
//   .folio-toggle__chevron {
//     transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
//   }
//   .folio-toggle[data-opened="true"] .folio-toggle__chevron {
//     transform: rotate(180deg);
//   }
//   @keyframes folio-filters-in {
//     from { opacity: 0; transform: translateY(-6px); }
//     to { opacity: 1; transform: translateY(0); }
//   }
//   @media (max-width: 48em) {
//     .folio-filters {
//       animation: folio-filters-in 0.2s cubic-bezier(0.16, 1, 0.3, 1);
//     }
//   }

//   .folio-tag-list {
//     max-height: 132px;
//     overflow-y: auto;
//     padding: 4px 4px 6px 0;
//     scrollbar-width: thin;
//     scrollbar-color: #FF7700 transparent;
//   }
// `;

// const FIELD_CLASSNAMES = {
//   label: "folio-field-label",
//   input: "folio-input",
//   section: "folio-section",
// };

// export default function CollectionDetailsLayout() {
//   const { id } = useParams();
//   const navigate = useNavigate();

//   const [data, setData] = useState<CollectionItemEntity[]>([]);
//   const [searchQuery, setSearchQuery] = useState("");
//   const [sortOrder, setSortOrder] = useState<string | null>("name-asc");
//   const [selectedTags, setSelectedTags] = useState<string[]>([]);
//   const [isPrevHovered, setIsPrevHovered] = useState(false);

//   // On mobile the search / sort / tag controls collapse behind a toggle.
//   const isMobile = useMediaQuery("(max-width: 48em)", false, {
//     getInitialValueInEffect: false,
//   });
//   const [filtersOpened, { toggle: toggleFilters }] = useDisclosure(false);
//   const showFilters = !isMobile || filtersOpened;

//   // Unique tags across all items, with how many items use each one.
//   const availableTags = useMemo(() => {
//     const counts = new Map<string, number>();
//     data.forEach((item) => {
//       new Set(item.tags ?? []).forEach((tag) => {
//         if (!tag) return;
//         counts.set(tag, (counts.get(tag) ?? 0) + 1);
//       });
//     });
//     return Array.from(counts.entries())
//       .map(([tag, count]) => ({ tag, count }))
//       .sort((a, b) => a.tag.localeCompare(b.tag));
//   }, [data]);

//   const toggleTag = (tag: string) => {
//     setSelectedTags((current) =>
//       current.includes(tag)
//         ? current.filter((t) => t !== tag)
//         : [...current, tag],
//     );
//   };

//   const activeFilterCount = (searchQuery.trim() ? 1 : 0) + selectedTags.length;

//   const filteredData = useMemo(() => {
//     const normalizedQuery = searchQuery.trim().toLocaleLowerCase();
//     const filtered = data.filter((item) => {
//       // Tag filter: an item must have ALL selected tags.
//       if (selectedTags.length > 0) {
//         const itemTags = item.tags ?? [];
//         if (!selectedTags.every((tag) => itemTags.includes(tag))) {
//           return false;
//         }
//       }

//       const searchableText = [
//         item.name,
//         item.author,
//         item.year,
//         ...(item.tags ?? []),
//       ]
//         .filter(Boolean)
//         .join(" ")
//         .toLocaleLowerCase();
//       return searchableText.includes(normalizedQuery);
//     });

//     return filtered.sort((a, b) => {
//       switch (sortOrder) {
//         case "name-desc":
//           return b.name.localeCompare(a.name);
//         case "author-asc":
//           return a.author.localeCompare(b.author);
//         case "newest":
//           return Date.parse(b.created_at) - Date.parse(a.created_at);
//         case "oldest":
//           return Date.parse(a.created_at) - Date.parse(b.created_at);
//         case "name-asc":
//         default:
//           return a.name.localeCompare(b.name);
//       }
//     });
//   }, [data, searchQuery, sortOrder, selectedTags]);

//   useEffect(() => {
//     async function fetchData() {
//       const response =
//         await CollectionService.getInstance().getCollectionItemsById(
//           Number(id),
//         );
//       if (response.success) {
//         setData((response.data ?? []) as CollectionItemEntity[]);
//       } else {
//         console.error(response.error);
//       }
//     }

//     (async () => await fetchData())();
//   }, [id]);

//   const handleReturn = () => {
//     if (window.history.state?.idx > 0) {
//       navigate(-1);
//     } else {
//       navigate("/collections");
//     }
//   };

//   return (
//     <LayoutWrapper>
//       <style>{FILTER_CSS}</style>
//       <Stack
//         mb={100}
//         pl={"md"}
//         pr={"md"}
//         style={{ position: "relative", isolation: "isolate" }}
//       >
//         <CyberpunkBackdrop variant="collectionDetails" />
//         <Group pt={"60"} justify={"center"}>
//           <Stack justify="center">
//             <Title
//               style={{
//                 fontSize: "clamp(36px, 7vw, 84px)",
//                 fontWeight: 900,
//                 color: "#FF7700",
//                 fontFamily: "DotGothic16",
//                 letterSpacing: "-2px",
//                 lineHeight: 1,
//                 textShadow: "0 0 12px rgba(255, 119, 0, 0.6)",
//                 textAlign: "center",
//               }}
//             >
//               <BilingualShuffle
//                 english={`COLLECTIONS`}
//                 japanese={`コレクション`}
//               />
//               <br />
//               <Group justify="center" align="top" gap={0}>
//                 <BilingualShuffle english={`${id}`} japanese={`${id}`} />
//               </Group>
//             </Title>
//           </Stack>
//         </Group>
//         <Stack
//           gap={0}
//           style={{
//             minHeight: "100dvh",
//           }}
//         >
//           <Group className="collections-toolbar__previous" mb={"16"}>
//             <Button
//               className="collections-toolbar__button"
//               size="md"
//               leftSection={<IconChevronLeft size={18} color="#FF7700" />}
//               onClick={handleReturn}
//               onMouseEnter={() => setIsPrevHovered(true)}
//               onMouseLeave={() => setIsPrevHovered(false)}
//               style={{
//                 backgroundColor: isPrevHovered
//                   ? "rgba(255, 119, 0, 0.15)"
//                   : "var(--folio-card)",
//                 border: isPrevHovered
//                   ? "1px solid #FF9933"
//                   : "1px solid #FF7700",
//                 borderRadius: "6px",
//                 boxShadow: isPrevHovered
//                   ? "0 0 18px rgba(255, 119, 0, 0.5)"
//                   : "none",
//                 transform: isPrevHovered ? "translateY(-2px)" : "translateY(0)",
//                 transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
//                 padding: "8px 18px",
//               }}
//             >
//               <Text
//                 style={{
//                   fontFamily: "DotGothic16",
//                   fontWeight: 700,
//                   fontSize: "14px",
//                   color: "#FF7700",
//                   letterSpacing: "1px",
//                   textTransform: "uppercase",
//                 }}
//               >
//                 <ShuffleText text={`Return`} />
//               </Text>
//             </Button>
//           </Group>

//           <Group gap="xs">
//             <IconFile size={18} color="#FF7700" />
//             <Text
//               style={{
//                 fontFamily: "DotGothic16",
//                 fontSize: "12px",
//                 fontWeight: 700,
//                 color: "#FF7700",
//                 letterSpacing: "1px",
//               }}
//             >
//               // COLLECTIONS_ITEMS
//             </Text>
//           </Group>

//           {isMobile && (
//             <UnstyledButton
//               className="folio-chip folio-toggle"
//               mt={8}
//               data-opened={filtersOpened}
//               aria-expanded={filtersOpened}
//               aria-controls="collection-filters"
//               onClick={toggleFilters}
//             >
//               <Group gap="xs" wrap="nowrap">
//                 <IconSearch size={16} />
//                 <span>Search & filter</span>
//                 {activeFilterCount > 0 && (
//                   <span className="folio-chip__count">
//                     {activeFilterCount} active
//                   </span>
//                 )}
//               </Group>
//               <Group gap="xs" wrap="nowrap">
//                 <span className="folio-chip__count">
//                   {filteredData.length}{" "}
//                   {filteredData.length === 1 ? "item" : "items"}
//                 </span>
//                 <IconChevronDown size={16} className="folio-toggle__chevron" />
//               </Group>
//             </UnstyledButton>
//           )}

//           {showFilters && (
//             <div id="collection-filters" className="folio-filters">
//               <Group align="end" mt={8} gap="md" wrap="wrap">
//                 <TextInput
//                   aria-label="Search collection items"
//                   label="Search items"
//                   placeholder="Search name, author, year, or tag"
//                   value={searchQuery}
//                   onChange={(event) =>
//                     setSearchQuery(event.currentTarget.value)
//                   }
//                   classNames={FIELD_CLASSNAMES}
//                   style={{ flex: "1 1 240px", maxWidth: 350 }}
//                 />
//                 <Select
//                   aria-label="Order collection items"
//                   label="Order by"
//                   data={SORT_OPTIONS}
//                   value={sortOrder}
//                   onChange={setSortOrder}
//                   allowDeselect={false}
//                   classNames={{
//                     ...FIELD_CLASSNAMES,
//                     dropdown: "folio-dropdown",
//                     option: "folio-option",
//                   }}
//                   style={{ flex: "0 1 220px" }}
//                 />
//                 {!isMobile && (
//                   <Text
//                     mb={10}
//                     style={{
//                       fontFamily: "DotGothic16",
//                       fontSize: "13px",
//                       letterSpacing: "1px",
//                       color: "#FF9933",
//                     }}
//                   >
//                     {filteredData.length}{" "}
//                     {filteredData.length === 1 ? "item" : "items"}
//                   </Text>
//                 )}
//               </Group>

//               {availableTags.length > 0 && (
//                 <Stack gap={6} mt="md">
//                   <Group gap="xs">
//                     <IconTag size={16} color="#FF7700" />
//                     <Text
//                       className="folio-field-label"
//                       style={{ marginBottom: 0 }}
//                     >
//                       Filter by tags
//                     </Text>
//                   </Group>
//                   <div
//                     className="folio-tag-list"
//                     role="group"
//                     aria-label="Filter collection items by tag"
//                   >
//                     <Group gap="xs">
//                       {availableTags.map(({ tag, count }) => {
//                         const isActive = selectedTags.includes(tag);
//                         return (
//                           <UnstyledButton
//                             key={`tag-filter-${tag}`}
//                             className="folio-chip"
//                             data-active={isActive}
//                             aria-pressed={isActive}
//                             onClick={() => toggleTag(tag)}
//                           >
//                             {tag}
//                             <span className="folio-chip__count">{count}</span>
//                           </UnstyledButton>
//                         );
//                       })}
//                       {selectedTags.length > 0 && (
//                         <UnstyledButton
//                           className="folio-chip folio-chip--clear"
//                           onClick={() => setSelectedTags([])}
//                         >
//                           <IconX size={14} />
//                           Clear ({selectedTags.length})
//                         </UnstyledButton>
//                       )}
//                     </Group>
//                   </div>
//                 </Stack>
//               )}
//             </div>
//           )}

//           <Grid mt={18}>
//             {filteredData.map((d, index) => (
//               <Grid.Col
//                 span={{
//                   base: 12,
//                   xs: 12,
//                   sm: 6,
//                   md: 6,
//                   lg: 4,
//                 }}
//                 key={`card-item-${index}`}
//               >
//                 <CollectionItemCard isMobile={isMobile} data={d} />
//               </Grid.Col>
//             ))}
//           </Grid>
//           {filteredData.length === 0 && (
//             <Text ta="center" c="dimmed" py="xl">
//               No items match your search.
//             </Text>
//           )}
//         </Stack>
//       </Stack>
//       <Box style={{ position: "relative", zIndex: 6 }}>
//         <CatchphraseCard
//           embedded={true}
//           contents={
//             <Text
//               size="lg"
//               c="white"
//               style={{
//                 fontFamily: "DM Mono, monospace",
//                 letterSpacing: ".1em",
//               }}
//             >
//               <BilingualShuffle
//                 english="A STASH OF CURATED TREASURES"
//                 japanese="秘蔵の宝物"
//               />
//             </Text>
//           }
//         />
//       </Box>
//       <Footer />
//     </LayoutWrapper>
//   );
// }
