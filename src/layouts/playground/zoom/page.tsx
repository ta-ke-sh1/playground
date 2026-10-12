import { useEffect, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Progress, Text, Title } from "@mantine/core";
import { useLenis } from "lenis/react";
import { Link } from "react-router-dom";
import "./page.css";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const SENSES = [
    {
        name: "Meadow Dawn",
        image:
            "https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?auto=format&fit=crop&w=2200&q=82",
    },
    {
        name: "First Tide",
        image:
            "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=2200&q=82",
    },
    {
        name: "Evening Silhouette",
        image:
            "https://images.unsplash.com/photo-1490730141103-6cac27aaab94?auto=format&fit=crop&w=2200&q=82",
    },
    {
        name: "Quiet Afterglow",
        image:
            "https://images.unsplash.com/photo-1495616811223-4d98c6e9c869?auto=format&fit=crop&w=2200&q=82",
    },
    {
        name: "Soft Horizon",
        image:
            "https://images.unsplash.com/photo-1473116763249-2faaef81ccda?auto=format&fit=crop&w=2200&q=82",
    },
    {
        name: "Alpine Dawn",
        image:
            "https://images.unsplash.com/photo-1507058868659-0a799c039186?auto=format&fit=crop&w=2200&q=82",
    },
    {
        name: "Violet Dusk",
        image:
            "https://images.unsplash.com/photo-1665215942279-c6e98049db8c?auto=format&fit=crop&w=2200&q=82",
    },
    {
        name: "Golden Hour",
        image:
            "https://images.unsplash.com/photo-1790541780498-58f36849a5df?auto=format&fit=crop&w=2200&q=82",
    },
    {
        name: "Mountain Daybreak",
        image:
            "https://images.unsplash.com/photo-1649080323235-9676688b8c82?auto=format&fit=crop&w=2200&q=82",
    },
    {
        name: "Last Light",
        image:
            "https://images.unsplash.com/photo-1667421429494-1834905e5dfa?auto=format&fit=crop&w=2200&q=82",
    },
] as const;

const LOOP_IMAGES = [...SENSES, SENSES[0]];

export default function InfiniteZoom() {
    const trackRef = useRef<HTMLElement>(null);
    const imageRefs = useRef<(HTMLDivElement | null)[]>([]);
    const titleListRef = useRef<HTMLOListElement>(null);
    const titleItemRefs = useRef<(HTMLLIElement | null)[]>([]);
    const [activeSense, setActiveSense] = useState(0);
    const [progress, setProgress] = useState(0);
    const lenis = useLenis();

    useEffect(() => {
        const titleList = titleListRef.current;
        const activeItem = titleItemRefs.current[activeSense];
        if (!titleList || !activeItem || titleList.scrollHeight <= titleList.clientHeight) {
            return;
        }

        const listBounds = titleList.getBoundingClientRect();
        const itemBounds = activeItem.getBoundingClientRect();
        const offset =
            itemBounds.top + itemBounds.height / 2 - (listBounds.top + listBounds.height / 2);
        titleList.scrollBy({ top: offset, behavior: "smooth" });
    }, [activeSense]);

    useEffect(() => {
        if (!lenis) return;

        const updateScrollTrigger = () => ScrollTrigger.update();
        lenis.on("scroll", updateScrollTrigger);
        lenis.scrollTo(0, { immediate: true });
        ScrollTrigger.refresh();

        return () => {
            lenis.off("scroll", updateScrollTrigger);
        };
    }, [lenis]);

    useGSAP(
        () => {
            if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
                return;
            }

            const timeline = gsap.timeline({
                scrollTrigger: {
                    trigger: trackRef.current,
                    start: "top top",
                    end: "bottom bottom",
                    scrub: true,
                    invalidateOnRefresh: true,
                    onUpdate: (trigger) => {
                        const progress = trigger.progress;
                        const nextSense = Math.min(
                            Math.floor(progress * SENSES.length),
                            SENSES.length - 1,
                        );

                        setActiveSense((current) =>
                            current === nextSense ? current : nextSense,
                        );

                        const percentage = Math.round(progress * 100);
                        setProgress((current) =>
                            current === percentage ? current : percentage,
                        );
                    },
                },
            });

            LOOP_IMAGES.slice(1).forEach((_, index) => {
                const image = imageRefs.current[index + 1];
                if (!image) return;

                timeline.set(image, { opacity: 1 }, index);

                timeline.to(
                    image,
                    {
                        scale: 1,
                        duration: 1,
                        ease: "none",
                    },
                    index,
                );
            });
        },
        { scope: trackRef, dependencies: [lenis], revertOnUpdate: true },
    );

    const currentSense = SENSES[activeSense];

    return (
        <main className="infinite-zoom-track" ref={trackRef}>
            <section className="infinite-zoom-scene" aria-label="A sequence of ten images">
                {LOOP_IMAGES.map((sense, index) => (
                    <div
                        className={`infinite-zoom-visual${index === 0 ? " is-visible" : ""}`}
                        key={`${sense.name}-${index}`}
                        ref={(element) => {
                            imageRefs.current[index] = element;
                        }}
                        aria-hidden="true"
                    >
                        <img
                            src={sense.image}
                            alt=""
                            fetchPriority={index === 0 ? "high" : "auto"}
                        />
                    </div>
                ))}

                <div className="infinite-zoom-shade" aria-hidden="true" />

                <header className="infinite-zoom-header">
                    <Link className="infinite-zoom-back" to="/" aria-label="Back to Playground">
                        <span>Playground No.4: Infinite Zoom</span>
                    </Link>
                </header>

                <nav className="infinite-zoom-title" aria-label="Sequence titles">
                    <Title order={1} className="infinite-zoom-visually-hidden" aria-live="polite">
                        {currentSense.name}
                    </Title>
                    <ol className="infinite-zoom-title-list" ref={titleListRef}>
                        {SENSES.map((sense, index) => (
                            <li
                                className={`infinite-zoom-title-item${index === activeSense ? " is-active" : ""}`}
                                key={sense.name}
                                ref={(element) => {
                                    titleItemRefs.current[index] = element;
                                }}
                                aria-current={index === activeSense ? "step" : undefined}
                            >
                                <span className="infinite-zoom-title-tick" aria-hidden="true" />
                                <Text component="span" className="infinite-zoom-title-name">
                                    {sense.name}
                                </Text>
                                <Text component="span" className="infinite-zoom-title-index">
                                    {String(index + 1).padStart(2, "0")}
                                </Text>
                            </li>
                        ))}
                    </ol>
                </nav>

                <footer className="infinite-zoom-progress">
                    <Text component="span" className="infinite-zoom-progress-label">
                        Perception
                    </Text>
                    <Progress
                        className="infinite-zoom-progress-track"
                        value={progress}
                        color="#d9ff65"
                        size={1}
                        radius={0}
                        aria-label="Sequence progress"
                    />
                    <Text component="span" className="infinite-zoom-progress-value">
                        {progress}%
                    </Text>
                </footer>
            </section>
        </main>
    );
}