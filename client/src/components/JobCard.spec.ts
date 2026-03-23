import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import JobCard from './JobCard.vue';
import type { JobApplication } from '@/types';

// A reusable mock job to use across tests
const mockJob: JobApplication = {
  id: 'abc-123',
  company: 'Acme Corp',
  title: 'Frontend Developer',
  dateApplied: '2026-03-18',
  status: 'applied',
  notes: 'Spoke to recruiter on Monday.',
  link: 'https://acme.com/jobs/1',
  userId: 'user-1',
  createdAt: '2026-03-18T00:00:00.000Z',
  updatedAt: '2026-03-18T00:00:00.000Z',
};

// Stub RouterLink so tests don't need a real router
const stubs = { RouterLink: { template: '<a><slot /></a>' } };

describe('JobCard', () => {
  it('renders the job title', () => {
    const wrapper = mount(JobCard, { props: { job: mockJob }, global: { stubs } });
    expect(wrapper.text()).toContain('Frontend Developer');
  });

  it('renders the company name', () => {
    const wrapper = mount(JobCard, { props: { job: mockJob }, global: { stubs } });
    expect(wrapper.text()).toContain('Acme Corp');
  });

  it('renders the status badge with the correct class', () => {
    const wrapper = mount(JobCard, { props: { job: mockJob }, global: { stubs } });
    expect(wrapper.find('.status-badge').classes()).toContain('status-applied');
  });

  it('renders the correct status badge class for each status', async () => {
    for (const status of ['applied', 'interviewing', 'offered', 'rejected'] as const) {
      const wrapper = mount(JobCard, {
        props: { job: { ...mockJob, status } },
        global: { stubs },
      });
      expect(wrapper.find('.status-badge').classes()).toContain(`status-${status}`);
    }
  });

  it('shows the job posting link when a link is provided', () => {
    const wrapper = mount(JobCard, { props: { job: mockJob }, global: { stubs } });
    expect(wrapper.find('a.meta-link').exists()).toBe(true);
  });

  it('hides the job posting link when no link is provided', () => {
    const wrapper = mount(JobCard, {
      props: { job: { ...mockJob, link: undefined } },
      global: { stubs },
    });
    expect(wrapper.find('a.meta-link').exists()).toBe(false);
  });

  it('renders notes when present', () => {
    const wrapper = mount(JobCard, { props: { job: mockJob }, global: { stubs } });
    expect(wrapper.text()).toContain('Spoke to recruiter on Monday.');
  });

  it('does not render the notes element when notes are absent', () => {
    const wrapper = mount(JobCard, {
      props: { job: { ...mockJob, notes: undefined } },
      global: { stubs },
    });
    expect(wrapper.find('.job-notes').exists()).toBe(false);
  });

  it('emits a delete event with the job id when delete is clicked', async () => {
    const wrapper = mount(JobCard, { props: { job: mockJob }, global: { stubs } });
    await wrapper.find('button').trigger('click');
    expect(wrapper.emitted('delete')?.[0]).toEqual(['abc-123']);
  });
});
