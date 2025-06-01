import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';

describe('Button 组件', () => {
  it('应该正确渲染按钮文本', () => {
    render(<div>点击我</div>);
    expect(screen.getByText('点击我')).toBeInTheDocument();
  });

  it('点击时应该触发 onClick 事件', () => {
    const handleClick = jest.fn();
    render(<div onClick={handleClick}>点击我</div>);
    
    fireEvent.click(screen.getByText('点击我'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
}); 