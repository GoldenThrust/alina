import type { ReactNode } from 'react';

type PageHeadingProps = {
	eyebrow?: string;
	title: string;
	description?: string;
	action?: ReactNode;
};

export default function PageHeading({ eyebrow, title, description, action }: PageHeadingProps) {
	return <div className="page-heading"><div>{eyebrow ? <p className="page-eyebrow">{eyebrow}</p> : null}<h1>{title}</h1>{description ? <p className="page-description">{description}</p> : null}</div>{action ? <div className="page-heading-action">{action}</div> : null}</div>;
}